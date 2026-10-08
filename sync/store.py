"""The store — sanitized public data + an honest, checksummed manifest.

Writes three artifacts under ``data/``:

* ``files.json``    the sanitized catalog (the public JSON surface)
* ``manifest.json`` run metadata, SHA-256 of each artifact, run history
* ``latest.md``     an Arabic human-readable digest

The manifest never contains content and never contains a matched secret —
when the scan gate blocks a run it records rule names and line numbers only.
"""
from __future__ import annotations

import hashlib
import json
import pathlib
from datetime import datetime, timezone

GENERATOR = "easy-ai-sync/1.0.0"
SCHEMA = 1


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256_file(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _write_json(path: pathlib.Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=1, sort_keys=True) + "\n",
                    encoding="utf-8")


def _digest_markdown(files_payload: dict, manifest_base: dict) -> str:
    status = manifest_base["status"]
    counts = manifest_base["counts"]
    lines = [
        "# آخر مزامنة — قناة easy-ai",
        "",
        f"- الحالة: **{status}**",
        f"- وقت التشغيل: {manifest_base['generated_at']} (UTC)",
        f"- رقم التشغيل: `{manifest_base['run_id']}`",
        f"- الملفات: {counts['files']} — بمحتوى: {counts['with_content']} "
        f"— تعديلات تحريرية (redactions): {counts['redactions']}",
    ]
    if manifest_base.get("missing"):
        lines.append(f"- متغيرات ناقصة (أسماء فقط): {', '.join(manifest_base['missing'])}")
    if manifest_base.get("scan_findings"):
        lines.append(f"- نتائج بوابة الفحص: {len(manifest_base['scan_findings'])} "
                     "(المحتوى محجوب حتى الإصلاح)")
    files = files_payload.get("files", []) if files_payload else []
    if files:
        lines += ["", "## الملفات", ""]
        for i, f in enumerate(files, 1):
            size = f.get("size_bytes")
            size_txt = f"{size} B" if isinstance(size, int) else "—"
            lines.append(
                f"{i}. **{f.get('name', '')}** — `{f.get('mime_type', '')}` — "
                f"{f.get('content_state', '')} — {size_txt} — "
                f"آخر تعديل: {f.get('modified_time', '')}"
            )
            if f.get("fetch_error"):
                lines.append(f"   - خطأ جلب (آمن): {f['fetch_error']}")
    lines.append("")
    return "\n".join(lines)


def write_run(data_dir: pathlib.Path, *, run_id: str, status: str,
              files_payload: dict | None, source_info: dict, counts: dict,
              missing: list[str] | None = None,
              scan_findings: list[dict] | None = None,
              notes: list[str] | None = None,
              keep_runs: int = 100) -> dict:
    """Write one run's artifacts and return the manifest that was written.

    When ``files_payload`` is None (not_configured / error / blocked runs),
    existing files.json and latest.md are left untouched — the dashboard keeps
    showing the last good data, with the new honest status on top.
    """
    data_dir.mkdir(parents=True, exist_ok=True)
    generated_at = utcnow_iso()

    manifest_base: dict = {
        "schema": SCHEMA,
        "generator": GENERATOR,
        "run_id": run_id,
        "generated_at": generated_at,
        "status": status,
        "source": source_info,
        "counts": counts,
        "missing": missing or [],
        "scan_findings": scan_findings or [],
        "notes": notes or [],
        "artifacts": {},
    }

    files_path = data_dir / "files.json"
    latest_path = data_dir / "latest.md"

    if files_payload is not None:
        files_payload = {**files_payload, "schema": SCHEMA, "generated_at": generated_at,
                         "run_id": run_id, "status": status}
        _write_json(files_path, files_payload)
        latest_md = _digest_markdown(files_payload, manifest_base)
        latest_path.parent.mkdir(parents=True, exist_ok=True)
        latest_path.write_text(latest_md, encoding="utf-8")
        manifest_base["artifacts"] = {
            "files.json": {"sha256": sha256_file(files_path),
                           "bytes": files_path.stat().st_size},
            "latest.md": {"sha256": sha256_file(latest_path),
                          "bytes": latest_path.stat().st_size},
        }

    manifest_path = data_dir / "manifest.json"
    history: list[dict] = []
    if manifest_path.exists():
        try:
            previous = json.loads(manifest_path.read_text(encoding="utf-8"))
            history = previous.get("history", [])
            if previous.get("run_id") and previous.get("run_id") != run_id:
                history.append({
                    "run_id": previous["run_id"],
                    "generated_at": previous.get("generated_at", ""),
                    "status": previous.get("status", ""),
                    "files": previous.get("counts", {}).get("files", 0),
                })
        except (json.JSONDecodeError, OSError):
            history = []
    manifest_base["history"] = history[-(keep_runs - 1):] if keep_runs > 1 else []
    manifest_base["last_good_run"] = _last_good(manifest_base["history"], files_path)

    _write_json(manifest_path, manifest_base)
    return manifest_base


def _last_good(history: list[dict], files_path: pathlib.Path) -> dict | None:
    for entry in reversed(history):
        if entry.get("status") == "ok":
            return entry
    if files_path.exists():
        return {"run_id": "seeded", "generated_at": "", "status": "ok", "files": None}
    return None
