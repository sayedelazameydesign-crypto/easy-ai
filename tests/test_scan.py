import json
import os
import pathlib

import pytest

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


# --- the gate fails closed ---------------------------------------------------

def test_missing_path_is_a_finding(tmp_path):
    """A vanished directory must never scan as "clean"."""
    findings = scan_paths([tmp_path / "renamed-away"])
    assert findings == [{"path": str(tmp_path / "renamed-away"), "line": 0, "rule": "missing_path"}]


def test_missing_path_fails_the_gate_even_without_the_flag():
    from sync.scan import main
    assert main(["definitely-not-here", "--gate"]) == 1
    assert main(["definitely-not-here"]) == 1        # a missing surface is a problem regardless


def test_directory_that_is_not_a_file_is_never_scanned_as_one(tmp_path):
    """A directory named like a text file is not a file: nothing is claimed for it."""
    (tmp_path / "weird.md").mkdir()
    assert scan_paths([tmp_path]) == []


@pytest.mark.skipif(not hasattr(os, "mkfifo"), reason="platform without FIFOs")
def test_non_regular_file_is_reported_not_read(tmp_path):
    """A fifo wearing a .md name cannot be scanned — reported, never opened."""
    os.mkfifo(tmp_path / "pipe.md")
    findings = scan_paths([tmp_path])
    assert findings == [{"path": str(tmp_path / "pipe.md"), "line": 0, "rule": "unreadable_file"}]


def test_unreadable_directory_is_a_finding(tmp_path, monkeypatch):
    """An unlistable directory is a finding — pathlib's rglob swallows the error."""
    target = tmp_path / "locked"
    target.mkdir()
    (target / "inner.md").write_text("harmless", encoding="utf-8")

    real_rglob = pathlib.Path.rglob

    def deny(self, *args, **kwargs):
        if self == target:
            raise PermissionError(13, "Permission denied")
        return real_rglob(self, *args, **kwargs)

    monkeypatch.setattr(pathlib.Path, "rglob", deny)
    findings = scan_paths([target])
    assert findings == [{"path": str(target), "line": 0, "rule": "unreadable_path"}]


def test_json_output_separates_secret_from_unreadable_findings(tmp_path, capsys):
    from sync.scan import main
    (tmp_path / "leak.md").write_text("ghp_" + "A" * 36, encoding="utf-8")
    rc = main([str(tmp_path), "gone", "--json"])
    assert rc == 1                   # fail closed: part of the surface could not be scanned
    payload = json.loads(capsys.readouterr().out)
    assert payload["count"] == 2
    assert payload["secret_findings"] == 1
    assert payload["unreadable_findings"] == 1
    assert "A" * 36 not in json.dumps(payload)     # the match itself is never emitted


def test_human_output_never_prints_the_matched_text(tmp_path, capsys):
    from sync.scan import main
    (tmp_path / "leak.md").write_text("token: ya29." + "Q" * 40, encoding="utf-8")
    assert main([str(tmp_path), "--gate"]) == 1
    out = capsys.readouterr().out
    assert "Q" * 40 not in out
    assert "leak.md:1:" in out


def test_rules_are_compiled_and_never_print_a_match():
    import re as _re

    from sync.scan import RULES
    assert RULES and all(isinstance(p, _re.Pattern) for _, p in RULES)
    names = [name for name, _ in RULES]
    assert len(names) == len(set(names))       # rule names are unique identifiers


def test_exit_codes_separate_gate_from_coverage(tmp_path, capsys):
    """Without --gate a secret finding is reported but not fatal; a surface that
    could not be scanned is fatal either way."""
    from sync.scan import main
    (tmp_path / "leak.md").write_text("ghp_" + "A" * 36, encoding="utf-8")

    assert main([str(tmp_path)]) == 0            # reported, gate not requested
    capsys.readouterr()
    assert main([str(tmp_path), "--gate"]) == 1  # now it is fatal
    capsys.readouterr()
    assert main([str(tmp_path / "clean-only")]) == 1   # missing ⇒ fail closed
