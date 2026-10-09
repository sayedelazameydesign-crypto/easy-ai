"""بوابة الفحص / the scan gate — last line of defense before publishing.

Scans text files for secret-shaped content. Findings never include the
matched text itself: only path, line number and rule name, so the report
can't become the leak.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys

#: (rule_name, pattern). Deliberately a superset of the redactor patterns:
#: the redactor scrubs what it knows, the gate catches what slipped through.
RULES: list[tuple[str, re.Pattern[str]]] = [
    ("private_key_block", re.compile(
        r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\b")),
    ("known_token_prefix", re.compile(
        r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}"
        r"|github_pat_[A-Za-z0-9_]{20,}"
        r"|sk-[A-Za-z0-9_\-]{16,}"
        r"|secret_[A-Za-z0-9]{20,}"
        r"|xox[baprs]-[A-Za-z0-9\-]{10,}"
        r"|AIza[A-Za-z0-9_\-]{30,}"
        r"|AKIA[0-9A-Z]{16}"
        r"|ya29\.[A-Za-z0-9_\-]{20,}"
        r"|1//0[A-Za-z0-9_\-]{20,})\b")),
    ("bearer_token", re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/\-]{16,}=*")),
    # assignment-shaped secrets: api_key = "....", token: .... — the redactor
    # does not scrub this shape, which is exactly why the gate exists.
    # `\\?` tolerates JSON-escaped quotes (\"key\": \"value\") inside data files.
    ("assigned_secret", re.compile(
        r"(?i)\b(?:api[_-]?key|secret|token|password|passwd|credential)"
        r"\\?[\"']?\s*[:=]\s*\\?[\"']?[A-Za-z0-9_\-/.+]{16,}")),
    ("aws_access_key_id", re.compile(r"\b(?:A3T[A-Z0-9]|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b")),
]

#: Path-level rules. The gate fails CLOSED: a missing path or an unreadable
#: file is a finding, not a silent skip — otherwise a renamed or permission-
#: broken directory would scan "clean" while publishing nothing was checked.
RULE_MISSING_PATH = "missing_path"
RULE_UNREADABLE_PATH = "unreadable_path"
RULE_UNREADABLE_FILE = "unreadable_file"

#: Never read as text: images, archives, fonts and compiled artifacts. A .pyc
#: would otherwise surface as "undecodable_binary" and fail the gate on build
#: output rather than on anything that could leak.
_SKIP_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip",
                  ".gz", ".bin", ".woff", ".woff2", ".ttf",
                  ".pyc", ".pyo", ".class", ".so", ".dylib", ".dll", ".exe"}


def scan_text(text: str) -> list[tuple[int, str]]:
    """Return [(line_number, rule_name)] for every finding in *text*."""
    findings: list[tuple[int, str]] = []
    for lineno, line in enumerate(text.splitlines(), start=1):
        for rule, pattern in RULES:
            if pattern.search(line):
                findings.append((lineno, rule))
    return findings


def scan_paths(paths: list[pathlib.Path]) -> list[dict]:
    findings: list[dict] = []
    for path in paths:
        if not path.exists():
            findings.append({"path": str(path), "line": 0, "rule": RULE_MISSING_PATH})
            continue
        if path.is_file():
            files = [path]
        else:
            try:
                # pathlib's rglob swallows permission errors, so probe the
                # directory explicitly: an unlistable directory is a finding,
                # never an empty (and therefore "clean") result.
                next(iter(path.iterdir()), None)
                # Enumerate everything that is not a directory: a fifo or device
                # node wearing a text-file name must be *reported*, and filtering
                # by is_file() here would silently drop it.
                files = sorted(p for p in path.rglob("*") if not p.is_dir())
            except OSError:
                findings.append({"path": str(path), "line": 0, "rule": RULE_UNREADABLE_PATH})
                continue
        for file in files:
            if file.suffix.lower() in _SKIP_SUFFIXES:
                continue
            if not file.is_file():
                # fifo/socket/device masquerading as a text file: cannot be
                # scanned, so it is reported instead of quietly skipped.
                findings.append({"path": str(file), "line": 0, "rule": RULE_UNREADABLE_FILE})
                continue
            try:
                text = file.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                findings.append({"path": str(file), "line": 0, "rule": "undecodable_binary"})
                continue
            except OSError:
                # Fail closed: an unreadable file is reported, never skipped.
                findings.append({"path": str(file), "line": 0, "rule": RULE_UNREADABLE_FILE})
                continue
            for lineno, rule in scan_text(text):
                findings.append({"path": str(file), "line": lineno, "rule": rule})
    return findings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="sync scan",
                                     description="Scan text paths for secret-shaped content.")
    parser.add_argument("paths", nargs="*", default=["data"],
                        help="files/directories to scan (default: data)")
    parser.add_argument("--gate", action="store_true",
                        help="exit non-zero when any secret-shaped finding exists")
    parser.add_argument("--json", action="store_true", help="emit findings as JSON")
    args = parser.parse_args(argv)

    paths = [pathlib.Path(p) for p in (args.paths or ["data"])]
    # No pre-filtering: scan_paths reports a missing path as a finding so the
    # gate can fail closed instead of declaring an unchecked surface "clean".
    findings = scan_paths(paths)
    unreadable = [f for f in findings
                  if f["rule"] in (RULE_MISSING_PATH, RULE_UNREADABLE_PATH, RULE_UNREADABLE_FILE)]
    secrets = len(findings) - len(unreadable)
    if args.json:
        print(json.dumps({"findings": findings, "count": len(findings),
                          "secret_findings": secrets,
                          "unreadable_findings": len(unreadable)}, ensure_ascii=False))
    else:
        if findings:
            for f in findings:
                print(f"{f['path']}:{f['line']}: {f['rule']}")
            print(f"scan: {len(findings)} finding(s) — matched text is never printed")
            if unreadable:
                print(f"scan: {len(unreadable)} path/file problem(s) — the gate fails closed; "
                      "an unchecked surface is never reported as clean")
        else:
            print("scan: clean — no secret-shaped content found")
    if unreadable:
        # Fail closed regardless of --gate: the scan itself did not cover
        # everything it was asked to, so "clean" would be a lie.
        return 1
    if args.gate and findings:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
