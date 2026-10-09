import json

import pytest

from sync.config import SyncConfig
from sync.crypto import vault_decrypt
from sync.pipeline import run


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


@pytest.fixture()
def cfg(tmp_path):
    c = SyncConfig()
    return c.with_root(tmp_path)


def test_ok_run_writes_all_artifacts(tmp_path, cfg):
    cache = cache_payload(tmp_path, [md_file()])
    summary = run(cache_path=cache, config=cfg, env={})
    assert summary["status"] == "ok"
    assert summary["counts"]["files"] == 1 and summary["counts"]["with_content"] == 1

    data = tmp_path / "data"
    files = json.loads((data / "files.json").read_text(encoding="utf-8"))
    manifest = json.loads((data / "manifest.json").read_text(encoding="utf-8"))
    latest = (data / "latest.md").read_text(encoding="utf-8")

    assert files["files"][0]["content"] == "# hi\nsome text"
    assert manifest["status"] == "ok"
    assert manifest["counts"]["files"] == 1
    assert manifest["artifacts"]["files.json"]["sha256"]
    assert "doc.md" in latest


def test_redaction_applied_to_content(tmp_path, cfg):
    leaky = md_file(content="contact john@example.com now")
    cache = cache_payload(tmp_path, [leaky])
    summary = run(cache_path=cache, config=cfg, env={})
    assert summary["counts"]["redactions"] >= 1
    files = json.loads((tmp_path / "data" / "files.json").read_text(encoding="utf-8"))
    assert "john@example.com" not in json.dumps(files)
    assert "[REDACTED:EMAIL]" in files["files"][0]["content"]


def test_env_secret_scrubbed_from_content(tmp_path, cfg):
    secret = "zz-top-secret-value-42"
    leaky = md_file(content=f"the vault key is {secret} — do not share")
    cache = cache_payload(tmp_path, [leaky])
    run(cache_path=cache, config=cfg, env={"SYNC_VAULT_KEY": secret})
    files = json.loads((tmp_path / "data" / "files.json").read_text(encoding="utf-8"))
    assert secret not in json.dumps(files)


def test_vault_snapshot_encrypted_and_gitignored(tmp_path, cfg, monkeypatch):
    monkeypatch.setenv("SYNC_VAULT_KEY", "local-test-vault-key-0123456789")
    cache = cache_payload(tmp_path, [md_file()])
    # env passed explicitly wins over os.environ in pipeline.run
    summary = run(cache_path=cache, config=cfg,
                  env={"SYNC_VAULT_KEY": "local-test-vault-key-0123456789"})
    assert summary["status"] == "ok"
    vault_files = list((tmp_path / "vault" / "gdrive").glob("snapshot-*.bin"))
    assert len(vault_files) == 1
    raw = vault_files[0].read_bytes()
    assert b"# hi" not in raw  # ciphertext, not plaintext
    plain = vault_decrypt(raw, "local-test-vault-key-0123456789")
    assert json.loads(plain)["files"][0]["name"] == "doc.md"


def test_not_configured_preserves_previous_and_lists_names(tmp_path, cfg):
    # first: a good cached run
    cache = cache_payload(tmp_path, [md_file()])
    run(cache_path=cache, config=cfg, env={})
    good_files = (tmp_path / "data" / "files.json").read_text(encoding="utf-8")

    # second: live run without credentials
    summary = run(config=cfg, env={})
    assert summary["status"] == "not_configured"
    assert set(summary["missing"]) == {"GOOGLE_DRIVE_REFRESH_TOKEN",
                                       "GOOGLE_DRIVE_CLIENT_ID",
                                       "GOOGLE_DRIVE_CLIENT_SECRET"}
    manifest = json.loads((tmp_path / "data" / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["status"] == "not_configured"
    assert manifest["missing"] == summary["missing"]
    # previous good catalog preserved untouched
    assert (tmp_path / "data" / "files.json").read_text(encoding="utf-8") == good_files
    assert manifest["last_good_run"] is not None
    # ...and the manifest says so instead of implying this run wrote it
    assert manifest["artifacts"]["files.json"]["written"] is False
    assert manifest["artifacts"]["files.json"]["sha256"]          # preserved, still checksummed
    assert manifest["artifacts"]["latest.md"]["written"] is True


def test_not_configured_digest_never_keeps_a_stale_ok(tmp_path, cfg):
    """latest.md must report the CURRENT run, not the last successful one.

    Regression: a preserved `ok` digest sitting next to a `not_configured`
    manifest made the public data/ surface contradict itself.
    """
    cache = cache_payload(tmp_path, [md_file()])
    run(cache_path=cache, config=cfg, env={})
    assert "الحالة: **ok**" in (tmp_path / "data" / "latest.md").read_text(encoding="utf-8")

    run(config=cfg, env={})
    latest = (tmp_path / "data" / "latest.md").read_text(encoding="utf-8")
    assert "الحالة: **not_configured**" in latest
    assert "الحالة: **ok**" not in latest
    # the preserved catalog is still listed, but labelled as preserved
    assert "doc.md" in latest
    assert "محفوظة من تشغيل سابق" in latest
    assert "GOOGLE_DRIVE_REFRESH_TOKEN" in latest      # names only, as always


def test_error_run_digest_reports_error_and_preserves_catalog(tmp_path, cfg):
    cache = cache_payload(tmp_path, [md_file()])
    run(cache_path=cache, config=cfg, env={})
    good_files = (tmp_path / "data" / "files.json").read_bytes()

    summary = run(cache_path=tmp_path / "missing.json", config=cfg, env={})
    assert summary["status"] == "error"
    assert (tmp_path / "data" / "files.json").read_bytes() == good_files
    latest = (tmp_path / "data" / "latest.md").read_text(encoding="utf-8")
    assert "الحالة: **error**" in latest
    assert "doc.md" in latest


def test_digest_without_any_published_content_says_so(tmp_path, cfg):
    summary = run(config=cfg, env={})                  # not_configured, nothing on disk
    assert summary["status"] == "not_configured"
    data = tmp_path / "data"
    assert not (data / "files.json").exists()
    latest = (data / "latest.md").read_text(encoding="utf-8")
    assert "لا يوجد محتوى منشور من هذا التشغيل" in latest
    manifest = json.loads((data / "manifest.json").read_text(encoding="utf-8"))
    assert list(manifest["artifacts"]) == ["latest.md"]
    assert manifest["last_good_run"] is None           # nothing good ever happened


def test_seeded_data_is_not_reported_as_a_successful_run(tmp_path):
    """A repo that ships data/ without a recorded ok run must not claim one."""
    from sync.store import write_run

    data = tmp_path / "data"
    data.mkdir(parents=True, exist_ok=True)
    (data / "files.json").write_text('{"files": []}', encoding="utf-8")   # seeded catalog
    manifest = write_run(data, run_id="RUN-1", status="not_configured", files_payload=None,
                         source_info={"type": "google-drive"}, counts={"files": 0},
                         keep_runs=100)
    assert manifest["last_good_run"]["status"] == "seeded"
    assert manifest["last_good_run"]["run_id"] == "seeded"
    assert "no successful sync run recorded" in manifest["last_good_run"]["note"]


def test_scan_gate_quarantines_slipped_secret(tmp_path, cfg):
    # assigned_secret shape is caught by the gate but not by the redactor
    leaky = md_file(content='config:\n  api_key = "AKIAIOSFODNN7EXAMPLE1"\n')
    cache = cache_payload(tmp_path, [leaky])
    summary = run(cache_path=cache, config=cfg, env={})
    assert summary["status"] == "blocked_scan"
    assert summary["scan_findings"] >= 1
    data = tmp_path / "data"
    assert not (data / "files.json").exists()      # content quarantined
    manifest = json.loads((data / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["status"] == "blocked_scan"
    assert manifest["scan_findings"][0]["rule"] == "assigned_secret"
    # the secret itself must not appear anywhere in the manifest
    assert "AKIAIOSFODNN7EXAMPLE1" not in json.dumps(manifest)
    # the digest is rewritten (not left stale, not left missing) and stays honest
    latest = (data / "latest.md").read_text(encoding="utf-8")
    assert "blocked_scan" in latest
    assert "AKIAIOSFODNN7EXAMPLE1" not in latest
    assert "doc.md" not in latest                  # quarantined catalog is not listed
    assert "files.json" not in manifest["artifacts"]
    assert manifest["artifacts"]["latest.md"]["written"] is True


def test_history_accumulates_and_dedupes_same_run(tmp_path, cfg, monkeypatch):
    cache = cache_payload(tmp_path, [md_file()])
    monkeypatch.setattr("sync.pipeline.run_id_now", lambda: "RUN-A")
    run(cache_path=cache, config=cfg, env={})
    monkeypatch.setattr("sync.pipeline.run_id_now", lambda: "RUN-B")
    run(cache_path=cache, config=cfg, env={})

    def manifest():
        return json.loads((tmp_path / "data" / "manifest.json").read_text(encoding="utf-8"))

    ids = [h["run_id"] for h in manifest()["history"]]
    assert ids == ["RUN-A"]

    # repeating the same run_id (e.g. a quarantining rewrite) never duplicates
    run(cache_path=cache, config=cfg, env={})
    m2 = manifest()
    assert m2["run_id"] == "RUN-B"
    assert [h["run_id"] for h in m2["history"]].count("RUN-A") == 1


def test_dry_run_leaves_repo_untouched(tmp_path, cfg):
    cache = cache_payload(tmp_path, [md_file()])
    summary = run(cache_path=cache, dry_run=True, config=cfg, env={})
    assert summary["status"] == "ok" and summary["dry_run"] is True
    assert not (tmp_path / "data").exists()
    assert not (tmp_path / "vault").exists()


def test_broken_cache_is_safe_error(tmp_path, cfg):
    bad = tmp_path / "bad.json"
    bad.write_text("{not json", encoding="utf-8")
    summary = run(cache_path=bad, config=cfg, env={})
    assert summary["status"] == "error"
    assert any("cache unreadable" in n for n in summary["notes"])
