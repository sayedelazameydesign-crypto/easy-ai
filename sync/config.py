"""Configuration: declarative file + environment. No secret ever lives in a file.

Mirrors the gateway rule: names are read from ``backend/integrations/config.py``
style loaders, and no value is ever printed or serialized. A half-present
credential trio is *not configured* — never attempted.
"""
from __future__ import annotations

import dataclasses
import os
import pathlib
from dataclasses import dataclass, field

import yaml

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG_PATH = REPO_ROOT / "config" / "sync.yaml"

#: Environment variable NAMES that may hold secret values. Only names here.
SECRET_ENV_NAMES = (
    "GOOGLE_DRIVE_ACCESS_TOKEN",
    "GOOGLE_DRIVE_REFRESH_TOKEN",
    "GOOGLE_DRIVE_CLIENT_ID",
    "GOOGLE_DRIVE_CLIENT_SECRET",
    "GOOGLE_SERVICE_ACCOUNT_JSON",
    "SYNC_VAULT_KEY",
    "GITHUB_TOKEN",
)

#: The permanent Drive credential trio (same names as the owner gateway).
DRIVE_TRIPLET = (
    "GOOGLE_DRIVE_REFRESH_TOKEN",
    "GOOGLE_DRIVE_CLIENT_ID",
    "GOOGLE_DRIVE_CLIENT_SECRET",
)


class NotConfiguredError(RuntimeError):
    """Credentials are absent or only half-present.

    Carries the *names* of the missing variables (never values), mirroring the
    gateway's ``503 not_configured`` + ``missing[]`` contract.
    """

    def __init__(self, missing: list[str]):
        self.missing = list(missing)
        super().__init__("not_configured: missing " + ", ".join(self.missing))


def drive_credentials(env: os._Environ | dict | None = None) -> str:
    """Return the credential mode to use, or raise :class:`NotConfiguredError`.

    Priority:
    1. ``GOOGLE_DRIVE_ACCESS_TOKEN``   (experiment: short-lived, never stored)
    2. the full refresh trio           (permanent: all-or-nothing)
    3. ``GOOGLE_SERVICE_ACCOUNT_JSON`` (service account)

    A half trio is *not configured* — we refuse to try it and report the
    missing names only.
    """
    env = os.environ if env is None else env
    if env.get("GOOGLE_DRIVE_ACCESS_TOKEN"):
        return "access_token"
    present = [n for n in DRIVE_TRIPLET if env.get(n)]
    if len(present) == len(DRIVE_TRIPLET):
        return "refresh_token"
    if env.get("GOOGLE_SERVICE_ACCOUNT_JSON"):
        return "service_account"
    if present:
        raise NotConfiguredError([n for n in DRIVE_TRIPLET if n not in present])
    raise NotConfiguredError(list(DRIVE_TRIPLET))


def collect_secret_values(env: os._Environ | dict | None = None) -> list[str]:
    """Collect every secret *value* present in the environment.

    Used only to build the redactor (exact-match scrubbing). Values are never
    logged, serialized, or returned to any caller other than the redactor.
    """
    env = os.environ if env is None else env
    values: list[str] = []
    for name in SECRET_ENV_NAMES:
        val = env.get(name)
        if val and len(val) >= 8:
            values.append(val)
    for name, val in env.items():
        if not val or len(val) < 12 or val in values:
            continue
        upper = name.upper()
        if upper.endswith(("_TOKEN", "_SECRET", "_KEY", "_PASSWORD")):
            values.append(val)
    return values


@dataclass
class DriveSourceConfig:
    folder_id: str | None = None  # optional default scope; env folder_env overrides
    folder_env: str = "GOOGLE_DRIVE_FOLDER_ID"
    max_files: int = 200
    max_file_bytes: int = 524_288  # 512 KB — same cap as the gateway upload limit
    content_mime_allowlist: tuple[str, ...] = (
        "text/markdown",
        "text/plain",
        "application/json",
    )
    export_google_docs: bool = True


@dataclass
class SyncConfig:
    repo_root: pathlib.Path = REPO_ROOT
    sanitize: bool = True
    encrypt_raw: bool = True
    keep_runs: int = 100
    vault_retention: int = 24
    drive: DriveSourceConfig = field(default_factory=DriveSourceConfig)

    @property
    def data_dir(self) -> pathlib.Path:
        return self.repo_root / "data"

    @property
    def vault_dir(self) -> pathlib.Path:
        return self.repo_root / "vault"

    @classmethod
    def load(cls, path: pathlib.Path | str | None = None) -> "SyncConfig":
        path = pathlib.Path(path) if path else CONFIG_PATH
        raw: dict = {}
        if path.exists():
            loaded = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
            if not isinstance(loaded, dict):
                raise ValueError(f"{path.name}: top-level YAML must be a mapping")
            raw = dict(loaded)
        drive_raw = dict(raw.pop("drive", {}) or {})
        if "content_mime_allowlist" in drive_raw:
            drive_raw["content_mime_allowlist"] = tuple(drive_raw["content_mime_allowlist"])
        known = {f for f in cls.__dataclass_fields__ if f != "repo_root"}
        kwargs = {k: v for k, v in raw.items() if k in known}
        return cls(drive=DriveSourceConfig(**drive_raw), **kwargs)

    def with_root(self, root: pathlib.Path) -> "SyncConfig":
        return dataclasses.replace(self, repo_root=pathlib.Path(root))
