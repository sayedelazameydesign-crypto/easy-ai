import json

from sync.scan import scan_paths, scan_text


def test_clean_text_passes():
    findings = scan_text("# عنوان\nنص عادي بلا أسرار\n| VAR_NAME | openssl rand -hex 32 |")
    assert findings == []


def test_known_token_detected_without_echoing_it():
    token = "ghp_" + "A1b2C3d4" * 6
    findings = scan_text(f"prefix {token} suffix")
    assert findings == [(1, "known_token_prefix")]


def test_assigned_secret_detected():
    findings = scan_text('api_key = "abcdef0123456789abcdef"')
    assert any(rule == "assigned_secret" for _, rule in findings)


def test_env_var_names_alone_are_not_findings():
    # names in tables/prose (like the gateway docs) must not trip the gate
    text = ("| `GOOGLE_DRIVE_REFRESH_TOKEN` + `GOOGLE_DRIVE_CLIENT_ID` | دائم |\n"
            "WAHA_OWNER_TOKEN | openssl rand -hex 32\n"
            "grant_type=refresh_token\n")
    assert scan_text(text) == []


def test_scan_paths_reports_path_line_rule_only(tmp_path):
    bad = tmp_path / "leak.json"
    bad.write_text(json.dumps({"x": "ya29." + "Q" * 40}), encoding="utf-8")
    good = tmp_path / "ok.md"
    good.write_text("fine\n", encoding="utf-8")
    findings = scan_paths([tmp_path])
    assert len(findings) == 1
    f = findings[0]
    assert set(f) == {"path", "line", "rule"}
    assert f["rule"] == "known_token_prefix"
    # the matched text itself never appears in the report
    assert "Q" * 40 not in json.dumps(findings)


def test_binary_file_flagged(tmp_path):
    (tmp_path / "blob.dat").write_bytes(b"\xff\xfe\x00\x01binary")
    findings = scan_paths([tmp_path])
    assert any(f["rule"] == "undecodable_binary" for f in findings)
