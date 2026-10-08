"""deploy-doctor for the sync channel: environment health, no network, no values.

Prints PRESENT/MISSING per variable name — never a value, never a length,
never a hint of content. Same honesty rule as the gateway: what we don't
know is reported as unknown, not as ready.
"""
from __future__ import annotations

import argparse
import importlib
import json
import os
import pathlib
import sys

from .config import DRIVE_TRIPLET, NotConfiguredError, SyncConfig, drive_credentials

REQUIRED_FOR_SYNC = DRIVE_TRIPLET  # or one of the alternative modes below
OPTIONAL_VARS = (
    "GOOGLE_DRIVE_ACCESS_TOKEN",
    "GOOGLE_SERVICE_ACCOUNT_JSON",
    "GOOGLE_DRIVE_FOLDER_ID",
    "SYNC_VAULT_KEY",
)
DEP_MODULES = ("requests", "cryptography", "yaml")


def check(env: dict | None = None, config_path: pathlib.Path | None = None) -> dict:
    env = dict(os.environ if env is None else env)
    report: dict = {"deps": {}, "vars": {}, "config": None, "credential_mode": None,
                    "missing": [], "problems": []}

    for module in DEP_MODULES:
        try:
            importlib.import_module(module)
            report["deps"][module] = "ok"
        except ImportError:
            report["deps"][module] = "MISSING"
            report["problems"].append(f"python dependency not installed: {module}")

    for name in REQUIRED_FOR_SYNC + OPTIONAL_VARS:
        report["vars"][name] = "PRESENT" if env.get(name) else "missing"

    try:
        cfg = SyncConfig.load(config_path)
        report["config"] = "ok"
        report["config_file"] = str(pathlib.Path(config_path) if config_path
                                    else cfg.repo_root / "config" / "sync.yaml")
    except Exception as exc:
        cfg = SyncConfig()
        report["config"] = f"UNPARSEABLE ({type(exc).__name__})"
        report["problems"].append("config/sync.yaml could not be parsed")

    try:
        report["credential_mode"] = drive_credentials(env)
    except NotConfiguredError as exc:
        report["credential_mode"] = "NOT_CONFIGURED"
        report["missing"] = exc.missing

    vault_key = env.get("SYNC_VAULT_KEY")
    if vault_key and len(vault_key) < 16:
        report["problems"].append("SYNC_VAULT_KEY present but shorter than 16 chars "
                                  "(vault encryption will refuse it)")

    for directory in ("data", "vault"):
        path = cfg.repo_root / directory
        try:
            path.mkdir(parents=True, exist_ok=True)
            probe = path / ".write-probe"
            probe.write_text("x", encoding="utf-8")
            probe.unlink()
        except OSError:
            report["problems"].append(f"{directory}/ is not writable")
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="sync doctor")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--strict", action="store_true",
                        help="exit 1 when Drive credentials are not configured")
    args = parser.parse_args(argv)

    report = check()
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=1))
    else:
        print("easy-ai sync doctor — no network calls, no values printed")
        print("-" * 56)
        for module, state in report["deps"].items():
            print(f"  dependency {module:<14}: {state}")
        print(f"  config file          : {report['config']}")
        for name, state in report["vars"].items():
            print(f"  {name:<32}: {state}")
        mode = report["credential_mode"]
        if mode == "NOT_CONFIGURED":
            print(f"  drive credentials    : NOT CONFIGURED "
                  f"(missing: {', '.join(report['missing'])})")
        else:
            print(f"  drive credentials    : mode = {mode}")
        if report["problems"]:
            print("  problems:")
            for problem in report["problems"]:
                print(f"    - {problem}")
        else:
            print("  problems: none")
    if args.strict and report["credential_mode"] == "NOT_CONFIGURED":
        return 1
    if any(state == "MISSING" for state in report["deps"].values()):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
