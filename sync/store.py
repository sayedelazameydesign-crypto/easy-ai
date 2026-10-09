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
from datetime import UTC, datetime

GENERATOR = "easy-ai-sync/1.0.0"
SCHEMA = 1


def utcnow_iso() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


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


def _load_published_files(data_dir: pathlib.Path) -> dict | None:
    """Return the already-published ``files.json`` payload, or None.

    Used when the current run published no content (``not_configured`` /
    ``error``): the catalog is preserved, so the digest can still list it —
    clearly labelled as coming from an earlier run.
    """
    path = data_dir / "files.json"
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return payload if isinstance(payload, dict) else None


def _digest_markdown(files_payload: dict | None, manifest_base: dict,
                     preserved_from: dict | None = None) -> str:
    status = manifest_base["status"]
    counts = manifest_base.get("counts") or {}
    lines = [
        "# آخر مزامنة — قناة easy-ai",
        "",
        f"- الحالة: **{status}**",
        f"- وقت التشغيل: {manifest_base['generated_at']} (UTC)",
        f"- رقم التشغيل: `{manifest_base['run_id']}`",
        # .get with an em dash: a missing count is shown as unknown, never as 0.
        f"- الملفات: {counts.get('files', '—')} — بمحتوى: {counts.get('with_content', '—')} "
        f"— تعديلات تحريرية (redactions): {counts.get('redactions', '—')}",
    ]
    if manifest_base.get("missing"):
        lines.append(f"- متغيرات ناقصة (أسماء فقط): {', '.join(manifest_base['missing'])}")
    if manifest_base.get("scan_findings"):
        lines.append(f"- نتائج بوابة الفحص: {len(manifest_base['scan_findings'])} "
                     "(المحتوى محجوب حتى الإصلاح)")

    files = files_payload.get("files", []) if files_payload else []
    if preserved_from is not None:
        # Nothing was fetched this run; the listing below is the preserved one.
        prev_run = preserved_from.get("run_id") or "غير معروف"
        prev_at = preserved_from.get("generated_at") or "غير معروف"
        lines.append(
            f"- هذا التشغيل لم يجلب محتوى؛ قائمة الملفات أدناه محفوظة من تشغيل سابق "
            f"(`{prev_run}` — {prev_at} UTC) وبقيت كما هي بلا تعديل."
        )
    elif not files:
        lines.append("- لا يوجد محتوى منشور من هذا التشغيل (لم يُكتب `files.json`).")

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

    ``latest.md`` is ALWAYS rewritten to match this run's honest status — even
    when nothing was fetched — so the two public artifacts can never disagree
    (a stale ``ok`` digest sitting next to a ``not_configured`` manifest is
    exactly the kind of invented state this channel refuses to publish).

    When ``files_payload`` is None (not_configured / error runs) the existing
    ``files.json`` is left byte-for-byte untouched: the dashboard keeps showing
    the last good catalog, labelled as preserved. The manifest then reports it
    with ``"written": false`` and carries its checksum and originating run_id,
    so a reader can verify the catalog was not silently rewritten.
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

    preserved_from = None
    if files_payload is not None:
        files_payload = {**files_payload, "schema": SCHEMA, "generated_at": generated_at,
                         "run_id": run_id, "status": status}
        _write_json(files_path, files_payload)
        digest_files = files_payload
    else:
        digest_files = _load_published_files(data_dir)
        if digest_files is not None:
            preserved_from = digest_files

    latest_md = _digest_markdown(digest_files, manifest_base, preserved_from=preserved_from)
    latest_path.parent.mkdir(parents=True, exist_ok=True)
    latest_path.write_text(latest_md, encoding="utf-8")

    artifacts: dict[str, dict] = {}
    if files_path.exists():
        artifacts["files.json"] = {
            "sha256": sha256_file(files_path),
            "bytes": files_path.stat().st_size,
            # Honest provenance: written by this run, or preserved from an
            # earlier one (never claimed as fresh when it is not).
            "written": files_payload is not None,
            "run_id": run_id if files_payload is not None
                      else (preserved_from or {}).get("run_id"),
        }
    artifacts["latest.md"] = {"sha256": sha256_file(latest_path),
                              "bytes": latest_path.stat().st_size,
                              "written": True, "run_id": run_id}
    manifest_base["artifacts"] = artifacts

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
    """Last run that really reported ``ok`` — never an invented one.

    A repo that shipped with seeded ``data/`` and no successful run in history
    is reported as ``seeded`` with an explicit note, so no reader (or the
    dashboard) can mistake pre-packaged data for a verified sync.
    """
    for entry in reversed(history):
        if entry.get("status") == "ok":
            return entry
    if files_path.exists():
        return {"run_id": "seeded", "generated_at": "", "status": "seeded", "files": None,
                "note": "shipped with the repository — no successful sync run recorded yet"}
    return None
