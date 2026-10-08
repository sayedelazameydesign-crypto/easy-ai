"""Command line: ``python -m sync {run,doctor,scan,decrypt}``."""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys

from . import __version__, pipeline
from .crypto import VaultError, vault_decrypt
from .doctor import main as doctor_main
from .scan import main as scan_main


def cmd_run(args: argparse.Namespace) -> int:
    summary = pipeline.run(cache_path=args.from_cache, dry_run=args.dry_run)
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as fh:
            fh.write(f"status={summary['status']}\n")
            fh.write(f"run_id={summary['run_id']}\n")
            fh.write(f"files={summary['counts']['files']}\n")
    if summary["status"] == "error":
        return 1
    return 0


def cmd_decrypt(args: argparse.Namespace) -> int:
    key = os.environ.get("SYNC_VAULT_KEY")
    if not key:
        print("SYNC_VAULT_KEY is not set — cannot decrypt", file=sys.stderr)
        return 2
    blob = pathlib.Path(args.file).read_bytes()
    try:
        plaintext = vault_decrypt(blob, key)
    except VaultError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    sys.stdout.buffer.write(plaintext)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="sync", description="easy-ai secure sync channel (Drive → repo → world)")
    parser.add_argument("--version", action="version", version=f"easy-ai-sync {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)

    p_run = sub.add_parser("run", help="execute one sync run")
    p_run.add_argument("--from-cache", metavar="JSON",
                       help="use a cached fetch payload instead of calling Drive")
    p_run.add_argument("--dry-run", action="store_true",
                       help="compute everything, write outside the repo")
    p_run.set_defaults(func=cmd_run)

    p_doctor = sub.add_parser("doctor", help="environment health, no network, no values")
    p_doctor.add_argument("--json", action="store_true")
    p_doctor.add_argument("--strict", action="store_true")
    p_doctor.set_defaults(func=lambda a: doctor_main(
        ["--json"] * a.json + ["--strict"] * a.strict))

    p_scan = sub.add_parser("scan", help="secret-shape scan gate")
    p_scan.add_argument("paths", nargs="*")
    p_scan.add_argument("--gate", action="store_true")
    p_scan.add_argument("--json", action="store_true")
    p_scan.set_defaults(func=lambda a: scan_main(
        list(a.paths) + ["--gate"] * a.gate + ["--json"] * a.json))

    p_dec = sub.add_parser("decrypt", help="decrypt a vault snapshot (needs SYNC_VAULT_KEY)")
    p_dec.add_argument("file")
    p_dec.set_defaults(func=cmd_decrypt)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
