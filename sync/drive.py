"""Google Drive source — read-only.

Fixed Google hosts only, credential modes identical to the owner gateway:

1. ``GOOGLE_DRIVE_ACCESS_TOKEN``    experiment: short-lived, never stored.
2. refresh trio (all-or-nothing)    permanent: mint an access token per run.
3. ``GOOGLE_SERVICE_ACCOUNT_JSON``  service account (RS256 JWT, drive.readonly).

No response body is ever placed in an exception message — errors carry HTTP
status codes only, so a leaked error can't leak data.
"""
from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass
from datetime import datetime, timezone

import requests

from .config import NotConfiguredError, SyncConfig, drive_credentials

TOKEN_URL = "https://oauth2.googleapis.com/token"
DRIVE_BASE = "https://www.googleapis.com/drive/v3"
DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly"
JWT_BEARER_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer"

#: Google Workspace mimes we can export as text, and the export target mime.
GOOGLE_MIME_EXPORT = {
    "application/vnd.google-apps.document": "text/plain",
    "application/vnd.google-apps.spreadsheet": "text/csv",
}
FOLDER_MIME = "application/vnd.google-apps.folder"

LIST_FIELDS = "nextPageToken,files(id,name,mimeType,modifiedTime,size,webViewLink,description)"
_TIMEOUT = 20


class DriveError(RuntimeError):
    """Drive failure with a *safe* message: HTTP status only, never a body."""


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@dataclass
class DriveClient:
    config: SyncConfig
    env: dict
    session: requests.Session | None = None
    credential_mode: str = "none"

    def __post_init__(self) -> None:
        if self.session is None:
            self.session = requests.Session()

    # -- credentials ------------------------------------------------------
    def access_token(self) -> str:
        mode = drive_credentials(self.env)  # may raise NotConfiguredError
        self.credential_mode = mode
        if mode == "access_token":
            return self.env["GOOGLE_DRIVE_ACCESS_TOKEN"]
        if mode == "refresh_token":
            return self._refresh_token()
        return self._service_account_token()

    def _refresh_token(self) -> str:
        resp = self.session.post(
            TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": self.env["GOOGLE_DRIVE_REFRESH_TOKEN"],
                "client_id": self.env["GOOGLE_DRIVE_CLIENT_ID"],
                "client_secret": self.env["GOOGLE_DRIVE_CLIENT_SECRET"],
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code != 200:
            # No body in the message: invalid_grant vs revoked must not be
            # guessable from a leaked log line.
            raise DriveError(f"token refresh failed (HTTP {resp.status_code})")
        token = self._parse_token(resp)
        return token

    def _service_account_token(self) -> str:
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding

        try:
            sa = json.loads(self.env["GOOGLE_SERVICE_ACCOUNT_JSON"])
        except (json.JSONDecodeError, TypeError):
            raise DriveError("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON")
        for field_name in ("client_email", "private_key", "token_uri"):
            if not sa.get(field_name):
                raise DriveError(f"service account JSON missing field: {field_name}")
        now = int(time.time())
        header = _b64url(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
        claims = _b64url(json.dumps({
            "iss": sa["client_email"],
            "scope": DRIVE_SCOPE,
            "aud": sa["token_uri"],
            "iat": now,
            "exp": now + 3600,
        }).encode())
        signing_input = f"{header}.{claims}".encode("ascii")
        try:
            key = serialization.load_pem_private_key(sa["private_key"].encode(), password=None)
            signature = key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
        except Exception:
            raise DriveError("service account private_key could not be used for signing")
        assertion = signing_input.decode("ascii") + "." + _b64url(signature)
        resp = self.session.post(
            sa["token_uri"],
            data={"grant_type": JWT_BEARER_GRANT, "assertion": assertion},
            timeout=_TIMEOUT,
        )
        if resp.status_code != 200:
            raise DriveError(f"service account token exchange failed (HTTP {resp.status_code})")
        return self._parse_token(resp)

    @staticmethod
    def _parse_token(resp: requests.Response) -> str:
        try:
            token = resp.json().get("access_token")
        except ValueError:
            token = None
        if not token:
            raise DriveError("token endpoint returned no access_token")
        return token

    # -- listing ----------------------------------------------------------
    def resolved_folder_id(self) -> str | None:
        env_name = self.config.drive.folder_env
        return self.env.get(env_name) or self.config.drive.folder_id or None

    def build_query(self) -> str:
        folder = self.resolved_folder_id()
        if folder:
            escaped = folder.replace("\\", "\\\\").replace("'", "\\'")
            return f"'{escaped}' in parents and trashed = false"
        return "trashed = false"

    def _headers(self, token: str) -> dict:
        return {"Authorization": f"Bearer {token}", "Accept": "application/json"}

    def list_files(self, token: str) -> list[dict]:
        cfg = self.config.drive
        query = self.build_query()
        files: list[dict] = []
        page_token = None
        while len(files) < cfg.max_files:
            params = {
                "q": query,
                "fields": LIST_FIELDS,
                "pageSize": min(100, cfg.max_files - len(files)),
                "supportsAllDrives": "true",
                "includeItemsFromAllDrives": "true",
            }
            if page_token:
                params["pageToken"] = page_token
            resp = self.session.get(f"{DRIVE_BASE}/files", params=params,
                                    headers=self._headers(token), timeout=_TIMEOUT)
            if resp.status_code != 200:
                raise DriveError(f"drive list failed (HTTP {resp.status_code})")
            try:
                payload = resp.json()
            except ValueError:
                raise DriveError("drive list returned a non-JSON body")
            files.extend(payload.get("files", []))
            page_token = payload.get("nextPageToken")
            if not page_token:
                break
        return files[: cfg.max_files]

    # -- content ----------------------------------------------------------
    def _read_capped(self, resp: requests.Response, limit: int) -> tuple[bytes, bool]:
        """Read at most limit+1 bytes; returns (bytes, exceeded)."""
        chunks: list[bytes] = []
        total = 0
        for chunk in resp.iter_content(chunk_size=65536):
            if not chunk:
                continue
            chunks.append(chunk)
            total += len(chunk)
            if total > limit:
                return b"".join(chunks)[: limit + 1], True
        return b"".join(chunks), False

    def _decode(self, raw: bytes) -> str:
        try:
            return raw.decode("utf-8")
        except UnicodeDecodeError:
            return raw.decode("utf-8", errors="replace")

    def fetch_content(self, token: str, meta: dict) -> tuple[str, str | None, str | None]:
        """Return (content_state, content, safe_error).

        content_state: ok | exported | folder | skipped_mime | too_large | error
        """
        cfg = self.config.drive
        mime = meta.get("mimeType", "")
        file_id = meta.get("id", "")
        if mime == FOLDER_MIME:
            return "folder", None, None
        size = meta.get("size")
        try:
            size_int = int(size) if size is not None else None
        except (TypeError, ValueError):
            size_int = None

        if mime in GOOGLE_MIME_EXPORT and cfg.export_google_docs:
            if size_int is not None and size_int > cfg.max_file_bytes:
                return "too_large", None, None
            resp = self.session.get(
                f"{DRIVE_BASE}/files/{file_id}/export",
                params={"mimeType": GOOGLE_MIME_EXPORT[mime]},
                headers=self._headers(token), timeout=_TIMEOUT, stream=True,
            )
            if resp.status_code != 200:
                return "error", None, f"export failed (HTTP {resp.status_code})"
            body, exceeded = self._read_capped(resp, cfg.max_file_bytes)
            if exceeded:
                return "too_large", None, None
            return "exported", self._decode(body), None

        if mime in cfg.content_mime_allowlist:
            if size_int is not None and size_int > cfg.max_file_bytes:
                return "too_large", None, None
            resp = self.session.get(
                f"{DRIVE_BASE}/files/{file_id}",
                params={"alt": "media", "supportsAllDrives": "true"},
                headers=self._headers(token), timeout=_TIMEOUT, stream=True,
            )
            if resp.status_code != 200:
                return "error", None, f"download failed (HTTP {resp.status_code})"
            body, exceeded = self._read_capped(resp, cfg.max_file_bytes)
            if exceeded:
                return "too_large", None, None
            return "ok", self._decode(body), None

        return "skipped_mime", None, None

    # -- full fetch -------------------------------------------------------
    def fetch(self) -> dict:
        """Fetch the catalog + allowed contents. Raises NotConfiguredError /
        DriveError / requests.RequestException (all handled by the pipeline)."""
        token = self.access_token()
        listed = self.list_files(token)
        records: list[dict] = []
        for meta in listed:
            state, content, err = self.fetch_content(token, meta)
            size = meta.get("size")
            try:
                size_bytes = int(size) if size is not None else None
            except (TypeError, ValueError):
                size_bytes = None
            records.append({
                "id": meta.get("id", ""),
                "name": meta.get("name", ""),
                "mime_type": meta.get("mimeType", ""),
                "modified_time": meta.get("modifiedTime", ""),
                "size_bytes": size_bytes,
                "web_view_link": meta.get("webViewLink", ""),
                "description": meta.get("description") or "",
                "content_state": state,
                "content": content,
                "fetch_error": err,
            })
        return {
            "fetched_at": _utcnow_iso(),
            "credential_mode": self.credential_mode,
            "folder_id": self.resolved_folder_id(),
            "query": self.build_query(),
            "files": records,
        }
