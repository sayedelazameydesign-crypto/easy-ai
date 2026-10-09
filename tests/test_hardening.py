"""Cross-module hardening: the gate fails closed, and nothing leaks upstream.

These tests exercise the seams between modules — where a shape check in one
layer has to turn into an honest status in the next — rather than a single unit.
"""
import json
import pathlib

import pytest
import requests

from sync.config import SyncConfig
from sync.pipeline import run
from sync.store import write_run


@pytest.fixture()
def cfg(tmp_path):
    return SyncConfig().with_root(tmp_path)


def cache_payload(tmp_path, files, **extra):
    payload = {"fetched_at": "2026-10-08T00:00:00Z", "credential_mode": "cache",
               "folder_id": "F1", "query": "q", "files": files, **extra}
    path = tmp_path / "cache.json"
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return path


def md_file(name="doc.md", content="# hi\nsome text", **kw):
    rec = {"id": "abc123", "name": name, "mime_type": "text/markdown",
           "modified_time": "2026-10-08T00:00:00Z", "size_bytes": len(content),
           "web_view_link": "https://drive.google.com/file/d/abc123/view",
           "description": "", "content_state": "ok", "content": content,
           "fetch_error": None}
    rec.update(kw)
    return rec


# --- the gate fails closed ---------------------------------------------------

def test_vanished_content_artifact_blocks_instead_of_publishing(tmp_path, cfg, monkeypatch):
    """If the artifact the gate must check disappears, the run is quarantined —
    a scan that could not run is never reported as a clean pass."""
    cache = cache_payload(tmp_path, [md_file()])
    data = tmp_path / "data"

    real_scan = pathlib.Path.exists
    calls = {"n": 0}

    def flaky_exists(self):
        # let the store write, then make files.json "vanish" before the gate
        if self == data / "files.json" and calls["n"] >= 1:
            return False
        if self == data / "files.json":
            calls["n"] += 1
        return real_scan(self)

    monkeypatch.setattr(pathlib.Path, "exists", flaky_exists)
    summary = run(cache_path=cache, config=cfg, env={})
    assert summary["status"] == "blocked_scan"
    manifest = json.loads((data / "manifest.json").read_text(encoding="utf-8"))
    assert any(f["rule"] == "missing_path" for f in manifest["scan_findings"])


def test_quarantine_leaves_no_content_behind(tmp_path, cfg):
    leaky = md_file(content='api_key = "AKIAIOSFODNN7EXAMPLE1"')
    cache = cache_payload(tmp_path, [leaky])
    summary = run(cache_path=cache, config=cfg, env={})
    assert summary["status"] == "blocked_scan"
    data = tmp_path / "data"
    assert not (data / "files.json").exists()
    published = (data / "manifest.json").read_text(encoding="utf-8") + \
        (data / "latest.md").read_text(encoding="utf-8")
    assert "AKIAIOSFODNN7EXAMPLE1" not in published
    assert "doc.md" not in published          # the quarantined catalog is not listed


def test_scan_findings_never_carry_the_matched_text(tmp_path, cfg):
    token = "ghp_" + "A1b2C3d4" * 6
    cache = cache_payload(tmp_path, [md_file(content=f"see {token} here")])
    summary = run(cache_path=cache, config=cfg, env={})
    data = tmp_path / "data"
    manifest = json.loads((data / "manifest.json").read_text(encoding="utf-8"))
    dumped = json.dumps(manifest, ensure_ascii=False) + json.dumps(summary, ensure_ascii=False)
    assert "A1b2C3d4" * 6 not in dumped
    assert summary["status"] in ("ok", "blocked_scan")
    for finding in manifest["scan_findings"]:
        assert set(finding) == {"path", "line", "rule"}


# --- network and fetch failures stay honest ----------------------------------

def test_network_failure_becomes_error_status_with_safe_note(tmp_path, cfg):
    class Boom:
        def fetch(self):
            raise requests.ConnectionError("connection reset by peer")

    summary = run(config=cfg, env={}, client=Boom())
    assert summary["status"] == "error"
    assert any("fetch failed" in n for n in summary["notes"])
    assert summary["counts"] == {"files": 0, "with_content": 0, "redactions": 0, "by_state": {}}
    # previous good data is preserved, and the manifest says it was not rewritten
    assert not (tmp_path / "data" / "files.json").exists()


def test_missing_cache_file_is_an_error_not_a_crash(tmp_path, cfg):
    summary = run(cache_path=tmp_path / "nope.json", config=cfg, env={})
    assert summary["status"] == "error"
    assert any("cache unreadable" in n for n in summary["notes"])


def test_unexpected_client_exception_propagates_nothing_sensitive(tmp_path, cfg):
    class Weird:
        def fetch(self):
            raise ValueError("Authorization: Bearer abcdefghijklmnop1234 was rejected")

    with pytest.raises(ValueError):
        run(config=cfg, env={}, client=Weird())
    # the pipeline never wrote a half-artifact for an exception it does not own
    assert not (tmp_path / "data" / "manifest.json").exists()


# --- secrets never travel upstream -------------------------------------------

def test_summary_never_contains_secret_values(tmp_path, cfg):
    secret = "zz-top-secret-value-42"
    cache = cache_payload(tmp_path, [md_file(content=f"vault key is {secret}")])
    summary = run(cache_path=cache, config=cfg,
                  env={"SYNC_VAULT_KEY": secret, "MY_ADMIN_TOKEN": secret})
    assert secret not in json.dumps(summary, ensure_ascii=False)
    assert secret not in json.dumps(cfg.__dict__, ensure_ascii=False, default=str)


def test_write_run_survives_a_counts_dict_with_missing_keys(tmp_path):
    """A partial counts dict must render as unknown, never as zero."""
    manifest = write_run(tmp_path / "data", run_id="RUN-X", status="error",
                         files_payload=None, source_info={"type": "google-drive"},
                         counts={"files": 3}, keep_runs=10)
    latest = (tmp_path / "data" / "latest.md").read_text(encoding="utf-8")
    assert "الملفات: 3" in latest
    assert "بمحتوى: —" in latest
    assert manifest["status"] == "error"
