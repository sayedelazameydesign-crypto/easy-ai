"""The pipeline — fetch ▶ redact ▶ vault ▶ store ▶ scan-gate.

Statuses (the dashboard shows them verbatim; nothing is ever dressed up):

* ``ok``             fetched, sanitized and stored.
* ``not_configured`` credentials absent or half-present; ``missing[]`` lists
  variable NAMES only. Previous good data is preserved.
* ``error``          fetch failed; the message is safe (status codes only).
* ``blocked_scan``   the redacted output still tripped the scan gate, so the
  content was quarantined (files.json removed) and only the manifest published.
"""
from __future__ import annotations

import contextlib
import json
import os
import pathlib
from datetime import UTC, datetime

import requests

from .config import NotConfiguredError, SyncConfig, collect_secret_values, drive_credentials
from .crypto import vault_encrypt
from .drive import DriveClient, DriveError
from .redact import Redactor
from .scan import scan_paths
from .store import write_run


def run_id_now() -> str:
    return datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")


def _counts_from(records: list[dict], redactions: int) -> dict:
    with_content = sum(1 for r in records if r.get("content") is not None)
    by_state: dict[str, int] = {}
    for r in records:
        by_state[r.get("content_state", "?")] = by_state.get(r.get("content_state", "?"), 0) + 1
    return {"files": len(records), "with_content": with_content,
            "redactions": redactions, "by_state": by_state}


def _write_vault(cfg: SyncConfig, source: str, run_id: str, raw: dict) -> str | None:
    """Encrypt the raw snapshot into vault/ (gitignored). Returns path or None."""
    vault_dir = cfg.vault_dir / source
    vault_dir.mkdir(parents=True, exist_ok=True)
    path = vault_dir / f"snapshot-{run_id}.bin"
    plaintext = json.dumps(raw, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    path.write_bytes(vault_encrypt(plaintext, os.environ["SYNC_VAULT_KEY"]))
    # retention: keep only the newest cfg.vault_retention snapshots
    snapshots = sorted(vault_dir.glob("snapshot-*.bin"))
    for old in snapshots[: max(0, len(snapshots) - cfg.vault_retention)]:
        with contextlib.suppress(OSError):
            old.unlink()
    return str(path)


def run(*, cache_path: str | os.PathLike | None = None,
        dry_run: bool = False,
        config: SyncConfig | None = None,
        env: dict | None = None,
        client: DriveClient | None = None) -> dict:
    """Execute one sync run. Returns a summary dict (never contains secrets)."""
    env = dict(os.environ if env is None else env)
    cfg = config or SyncConfig.load()
    source = "gdrive"
    run_id = run_id_now()
    redactor = Redactor(collect_secret_values(env))

    status = "ok"
    missing: list[str] = []
    notes: list[str] = []
    raw: dict | None = None
    records: list[dict] = []
    source_info = {"type": "google-drive", "credential_mode": "none", "folder_id": None,
                   "query": None}

    # 1) fetch -------------------------------------------------------------
    if cache_path is not None:
        try:
            raw = json.loads(pathlib.Path(cache_path).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            status, raw = "error", None
            notes.append(f"cache unreadable: {type(exc).__name__}")
        if raw is not None:
            records = list(raw.get("files", []))
            source_info = {"type": "google-drive",
                           "credential_mode": raw.get("credential_mode", "cache"),
                           "folder_id": raw.get("folder_id"),
                           "query": raw.get("query")}
    else:
        try:
            client = client or DriveClient(config=cfg, env=env)
            raw = client.fetch()
            records = list(raw.get("files", []))
            source_info = {"type": "google-drive",
                           "credential_mode": raw.get("credential_mode", "none"),
                           "folder_id": raw.get("folder_id"),
                           "query": raw.get("query")}
        except NotConfiguredError as exc:
            status, raw = "not_configured", None
            missing = exc.missing
            notes.append("half-configured credentials are treated as not configured "
                         "(gateway rule) — nothing was attempted")
        except (DriveError, requests.RequestException) as exc:
            status, raw = "error", None
            # DriveError messages are already body-free; redact anyway.
            safe, _ = redactor.redact_text(str(exc))
            notes.append(f"fetch failed: {safe}")
            try:
                mode = drive_credentials(env)
                source_info["credential_mode"] = mode
            except NotConfiguredError as nce:
                missing = nce.missing

    # 2) redact --------------------------------------------------------------
    sanitized_records: list[dict] = []
    redaction_count = 0
    if cfg.sanitize:
        for record in records:
            clean, n = redactor.redact_obj(record)
            redaction_count += n
            sanitized_records.append(clean)
    else:
        sanitized_records = list(records)

    files_payload = {"source": source_info, "files": sanitized_records} if status == "ok" else None
    counts = _counts_from(sanitized_records, redaction_count)

    # 3) vault (raw, encrypted, gitignored) ----------------------------------
    if raw is not None and cfg.encrypt_raw and not dry_run:
        if env.get("SYNC_VAULT_KEY"):
            try:
                vault_path = _write_vault(cfg, source, run_id, raw)
                notes.append(f"encrypted raw snapshot stored at {vault_path} (never committed)")
            except Exception:
                notes.append("vault snapshot skipped (encryption failed)")
        else:
            notes.append("SYNC_VAULT_KEY not set — no encrypted raw snapshot was kept")

    # 4) store ----------------------------------------------------------------
    target_root = cfg.repo_root
    if dry_run:
        import tempfile
        target_root = pathlib.Path(tempfile.mkdtemp(prefix="easy-ai-dryrun-"))
        notes.append(f"dry run: artifacts written to {target_root} (repo untouched)")

    data_dir = target_root / "data"
    manifest = write_run(
        data_dir,
        run_id=run_id,
        status=status if status != "ok" else "ok",
        files_payload=files_payload,
        source_info=source_info,
        counts=counts,
        missing=missing,
        scan_findings=[],
        notes=notes,
        keep_runs=cfg.keep_runs,
    )

    # 5) scan gate -------------------------------------------------------------
    if files_payload is not None:
        findings = scan_paths([data_dir / "files.json", data_dir / "latest.md"])
        if findings:
            # Quarantine: remove the content artifacts, republish an honest
            # manifest. Findings carry path/line/rule only — never the match.
            for name in ("files.json", "latest.md"):
                with contextlib.suppress(OSError):
                    (data_dir / name).unlink()
            manifest = write_run(
                data_dir, run_id=run_id, status="blocked_scan",
                files_payload=None, source_info=source_info, counts=counts,
                missing=missing, scan_findings=findings,
                notes=[*notes, "scan gate blocked publication; content quarantined"],
                keep_runs=cfg.keep_runs,
            )
            status = "blocked_scan"

    return {
        "run_id": run_id,
        "status": status,
        "counts": counts,
        "missing": missing,
        "notes": notes,
        "scan_findings": len(manifest.get("scan_findings", [])),
        "dry_run": dry_run,
        "data_dir": str(data_dir),
    }
