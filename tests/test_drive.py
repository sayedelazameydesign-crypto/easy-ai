import json

import pytest

from sync.config import NotConfiguredError, SyncConfig
from sync.drive import (
    DRIVE_BASE,
    SA_TOKEN_HOSTS,
    SA_TOKEN_PATH,
    DriveClient,
    DriveError,
    _check_token_uri,
)


class FakeResponse:
    def __init__(self, status_code=200, payload=None, body=b"", json_ok=True):
        self.status_code = status_code
        self._payload = payload
        self.content = body
        self._json_ok = json_ok

    def json(self):
        if not self._json_ok:
            raise ValueError("no json")
        return self._payload

    def iter_content(self, chunk_size=65536):
        for i in range(0, len(self.content), chunk_size):
            yield self.content[i:i + chunk_size]


class FakeSession:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def _next(self, method, url, **kw):
        self.calls.append((method, url, kw))
        item = self.responses.pop(0)
        if isinstance(item, Exception):
            raise item
        return item

    def get(self, url, **kw):
        return self._next("get", url, **kw)

    def post(self, url, **kw):
        return self._next("post", url, **kw)


TRIO = {"GOOGLE_DRIVE_REFRESH_TOKEN": "rt", "GOOGLE_DRIVE_CLIENT_ID": "cid",
        "GOOGLE_DRIVE_CLIENT_SECRET": "csec"}


def make_client(env=None, responses=(), cfg=None):
    cfg = cfg or SyncConfig()
    return DriveClient(config=cfg, env={**TRIO, **(env or {})},
                       session=FakeSession(responses))


def test_refresh_flow_and_listing():
    token_resp = FakeResponse(payload={"access_token": "tok123", "expires_in": 3599})
    list_resp = FakeResponse(payload={
        "files": [
            {"id": "f1", "name": "a.md", "mimeType": "text/markdown",
             "modifiedTime": "2026-10-08T00:00:00Z", "size": "5",
             "webViewLink": "https://drive.google.com/file/d/f1/view",
             "description": ""},
            {"id": "f2", "name": "docs", "mimeType": "application/vnd.google-apps.folder",
             "modifiedTime": "2026-10-08T00:00:00Z",
             "webViewLink": "https://drive.google.com/drive/folders/f2"},
        ],
    })
    media_resp = FakeResponse(body=b"hello")
    client = make_client(responses=[token_resp, list_resp, media_resp])
    out = client.fetch()
    assert out["credential_mode"] == "refresh_token"
    assert len(out["files"]) == 2
    md, folder = out["files"]
    assert md["content_state"] == "ok" and md["content"] == "hello"
    assert folder["content_state"] == "folder" and folder["content"] is None
    # refresh POST must carry the trio, and listing must be scoped by the query
    method, url, kw = client.session.calls[0]
    assert (method, url) == ("post", "https://oauth2.googleapis.com/token")
    assert kw["data"]["grant_type"] == "refresh_token"
    assert "Authorization" in client.session.calls[1][2]["headers"]


def test_token_error_message_has_no_body():
    body = '{"error":"invalid_grant","error_description":"Token has been expired"}'
    client = make_client(responses=[FakeResponse(status_code=400, payload=None, json_ok=False)])
    with pytest.raises(DriveError) as exc:
        client.fetch()
    msg = str(exc.value)
    assert "400" in msg
    assert "invalid_grant" not in msg and "expired" not in msg
    assert body not in msg


def test_half_trio_refuses_without_network():
    client = DriveClient(config=SyncConfig(),
                         env={"GOOGLE_DRIVE_REFRESH_TOKEN": "rt"},
                         session=FakeSession([]))
    with pytest.raises(NotConfiguredError) as exc:
        client.fetch()
    assert exc.value.missing == ["GOOGLE_DRIVE_CLIENT_ID", "GOOGLE_DRIVE_CLIENT_SECRET"]
    assert client.session.calls == []  # nothing was attempted


def test_size_cap_marks_too_large_without_download():
    list_resp = FakeResponse(payload={"files": [
        {"id": "big", "name": "big.json", "mimeType": "application/json",
         "size": "999999", "webViewLink": "u", "modifiedTime": "t"}]})
    client = make_client(responses=[
        FakeResponse(payload={"access_token": "t"}), list_resp])
    out = client.fetch()
    assert out["files"][0]["content_state"] == "too_large"
    assert len(client.session.calls) == 2  # token + list only


def test_streaming_cap_catches_lying_size():
    list_resp = FakeResponse(payload={"files": [
        {"id": "x", "name": "x.txt", "mimeType": "text/plain",
         "webViewLink": "u", "modifiedTime": "t"}]})  # no size at all
    huge = b"z" * (524288 + 10)
    client = make_client(responses=[
        FakeResponse(payload={"access_token": "t"}), list_resp, FakeResponse(body=huge)])
    out = client.fetch()
    assert out["files"][0]["content_state"] == "too_large"


def test_google_doc_exported_as_text():
    list_resp = FakeResponse(payload={"files": [
        {"id": "d1", "name": "Doc", "mimeType": "application/vnd.google-apps.document",
         "webViewLink": "u", "modifiedTime": "t", "size": "10"}]})
    client = make_client(responses=[
        FakeResponse(payload={"access_token": "t"}), list_resp,
        FakeResponse(body="نص المستند".encode())])
    out = client.fetch()
    rec = out["files"][0]
    assert rec["content_state"] == "exported" and rec["content"] == "نص المستند"
    _, url, kw = client.session.calls[2]
    assert url.endswith("/export") and kw["params"]["mimeType"] == "text/plain"


def test_disallowed_mime_metadata_only():
    list_resp = FakeResponse(payload={"files": [
        {"id": "n1", "name": "book.ipynb", "mimeType": "application/vnd.google.colaboratory",
         "webViewLink": "u", "modifiedTime": "t", "size": "900"}]})
    client = make_client(responses=[
        FakeResponse(payload={"access_token": "t"}), list_resp])
    out = client.fetch()
    assert out["files"][0]["content_state"] == "skipped_mime"


def test_folder_scoping_query():
    cfg = SyncConfig()
    cfg.drive.folder_id = "FOLDER123"
    client = make_client(cfg=cfg, responses=[
        FakeResponse(payload={"access_token": "t"}),
        FakeResponse(payload={"files": []})])
    client.fetch()
    _, _, kw = client.session.calls[1]
    assert "'FOLDER123' in parents" in kw["params"]["q"]
    assert "trashed = false" in kw["params"]["q"]
    assert kw["params"]["supportsAllDrives"] == "true"


def test_env_folder_overrides_config():
    cfg = SyncConfig()
    cfg.drive.folder_id = "FROMCONFIG"
    client = make_client(env={"GOOGLE_DRIVE_FOLDER_ID": "FROMENV"}, responses=[
        FakeResponse(payload={"access_token": "t"}),
        FakeResponse(payload={"files": []})])
    out = client.fetch()
    assert out["folder_id"] == "FROMENV"


def test_pagination_respects_max_files():
    cfg = SyncConfig()
    cfg.drive.max_files = 3
    page1 = FakeResponse(payload={
        "files": [{"id": f"a{i}", "name": f"a{i}", "mimeType": "text/plain",
                   "size": "1", "webViewLink": "u", "modifiedTime": "t"} for i in range(2)],
        "nextPageToken": "p2"})
    page2 = FakeResponse(payload={
        "files": [{"id": f"b{i}", "name": f"b{i}", "mimeType": "text/plain",
                   "size": "1", "webViewLink": "u", "modifiedTime": "t"} for i in range(2)]})
    client = make_client(cfg=cfg, responses=[
        FakeResponse(payload={"access_token": "t"}), page1, page2,
        FakeResponse(body=b"x"), FakeResponse(body=b"x"), FakeResponse(body=b"x")])
    out = client.fetch()
    assert len(out["files"]) == 3


def test_service_account_bad_json_is_safe_error():
    client = DriveClient(config=SyncConfig(),
                         env={"GOOGLE_SERVICE_ACCOUNT_JSON": "not json{"},
                         session=FakeSession([]))
    with pytest.raises(DriveError) as exc:
        client.access_token()
    assert "not valid JSON" in str(exc.value)
    assert "not json{" not in str(exc.value).replace("not valid JSON", "")


def test_service_account_jwt_flow():
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()).decode()
    sa = json.dumps({"client_email": "sync@proj.iam.gserviceaccount.com",
                     "private_key": pem,
                     "token_uri": "https://oauth2.googleapis.com/token"})
    client = DriveClient(config=SyncConfig(),
                         env={"GOOGLE_SERVICE_ACCOUNT_JSON": sa},
                         session=FakeSession([FakeResponse(payload={"access_token": "sa-tok"})]))
    assert client.access_token() == "sa-tok"
    assert client.credential_mode == "service_account"
    method, url, kw = client.session.calls[0]
    assert method == "post"
    assert url == "https://oauth2.googleapis.com/token"   # pinned, never sa["token_uri"]
    assert kw["data"]["grant_type"] == \
        "urn:ietf:params:oauth:grant-type:jwt-bearer"
    assert kw["data"]["assertion"].count(".") == 2


# --- service-account endpoint pinning ---------------------------------------
# `token_uri` lives inside the GOOGLE_SERVICE_ACCOUNT_JSON secret, so a tampered
# secret could otherwise aim the signed assertion at an attacker host.

def _sa_json(token_uri, client_email="sync@proj.iam.gserviceaccount.com"):
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(encoding=serialization.Encoding.PEM,
                            format=serialization.PrivateFormat.PKCS8,
                            encryption_algorithm=serialization.NoEncryption()).decode()
    return json.dumps({"client_email": client_email, "private_key": pem,
                       "token_uri": token_uri})


@pytest.mark.parametrize("bad_uri", [
    "http://oauth2.googleapis.com/token",                 # downgrade to plain HTTP
    "https://evil.test/token",                            # unrelated host
    "https://oauth2.googleapis.com.evil.test/token",      # suffix lookalike
    "https://oauth2.googleapis.com:8443/token",           # unexpected port
    "https://oauth2.googleapis.com/token/extra",          # unexpected path
    "https://oauth2.googleapis.com/token?redirect=x",     # query smuggling
    "https:///token",                                     # no host at all
    "oauth2.googleapis.com/token",                        # no scheme
])
def test_service_account_refuses_non_google_token_uri(bad_uri):
    client = DriveClient(config=SyncConfig(),
                         env={"GOOGLE_SERVICE_ACCOUNT_JSON": _sa_json(bad_uri)},
                         session=FakeSession([]))
    with pytest.raises(DriveError) as exc:
        client.access_token()
    assert "not an approved Google token endpoint" in str(exc.value)
    assert client.session.calls == []          # refused BEFORE any request was made


@pytest.mark.parametrize("bad_uri", ["", "   ", None, 1234, ["https://oauth2.googleapis.com"]])
def test_service_account_rejects_unusable_token_uri(bad_uri):
    """Empty or non-string token_uri is caught as a missing field — no request."""
    client = DriveClient(config=SyncConfig(),
                         env={"GOOGLE_SERVICE_ACCOUNT_JSON": _sa_json(bad_uri)},
                         session=FakeSession([]))
    with pytest.raises(DriveError) as exc:
        client.access_token()
    assert "missing field: token_uri" in str(exc.value)
    assert client.session.calls == []


def test_service_account_error_never_echoes_the_url():
    client = DriveClient(config=SyncConfig(),
                         env={"GOOGLE_SERVICE_ACCOUNT_JSON":
                              _sa_json("https://collector.evil.test/token?exfil=1")},
                         session=FakeSession([]))
    with pytest.raises(DriveError) as exc:
        client.access_token()
    message = str(exc.value)
    # host + scheme are safe diagnostics; the full URL and query are not
    assert "collector.evil.test" in message
    assert "exfil=1" not in message
    assert "https://collector.evil.test/token" not in message


def test_token_uri_helper_accepts_only_pinned_google_https():
    for host in sorted(SA_TOKEN_HOSTS):
        assert _check_token_uri(f"https://{host}{SA_TOKEN_PATH}") == f"https://{host}{SA_TOKEN_PATH}"
    with pytest.raises(DriveError):
        _check_token_uri("https://accounts.google.com/o/oauth2/token")


def test_service_account_json_must_be_an_object():
    client = DriveClient(config=SyncConfig(),
                         env={"GOOGLE_SERVICE_ACCOUNT_JSON": "[1, 2, 3]"},
                         session=FakeSession([]))
    with pytest.raises(DriveError) as exc:
        client.access_token()
    assert "must be a JSON object" in str(exc.value)
    assert "[1, 2, 3]" not in str(exc.value)


def test_service_account_rejects_non_string_fields():
    client = DriveClient(config=SyncConfig(),
                         env={"GOOGLE_SERVICE_ACCOUNT_JSON": json.dumps(
                             {"client_email": 5, "private_key": "x",
                              "token_uri": "https://oauth2.googleapis.com/token"})},
                         session=FakeSession([]))
    with pytest.raises(DriveError) as exc:
        client.access_token()
    assert "missing field: client_email" in str(exc.value)


# --- token endpoint response shape ------------------------------------------

@pytest.mark.parametrize("payload", [
    ["not", "a", "dict"],
    "just a string",
    42,
    None,
])
def test_token_response_must_be_a_json_object(payload):
    client = make_client(responses=[FakeResponse(payload=payload)])
    with pytest.raises(DriveError) as exc:
        client.access_token()
    assert "unexpected JSON shape" in str(exc.value)


@pytest.mark.parametrize("token", [None, "", "   ", 12345, {"nested": "object"}, ["list"]])
def test_token_response_rejects_unusable_access_token(token):
    client = make_client(responses=[FakeResponse(payload={"access_token": token})])
    with pytest.raises(DriveError) as exc:
        client.access_token()
    assert "no access_token" in str(exc.value)


def test_token_response_non_json_is_drive_error():
    client = make_client(responses=[FakeResponse(json_ok=False)])
    with pytest.raises(DriveError) as exc:
        client.access_token()
    assert "non-JSON body" in str(exc.value)


# --- listing response shape --------------------------------------------------

def test_list_rejects_non_dict_payload():
    client = make_client(responses=[FakeResponse(payload={"access_token": "t"}),
                                    FakeResponse(payload=["nope"])])
    with pytest.raises(DriveError) as exc:
        client.fetch()
    assert "unexpected JSON shape" in str(exc.value)


def test_list_rejects_non_list_files_field():
    client = make_client(responses=[FakeResponse(payload={"access_token": "t"}),
                                    FakeResponse(payload={"files": {"id": "f1"}})])
    with pytest.raises(DriveError) as exc:
        client.fetch()
    assert "non-list" in str(exc.value)


def test_list_rejects_malformed_file_entry():
    client = make_client(responses=[FakeResponse(payload={"access_token": "t"}),
                                    FakeResponse(payload={"files": ["just-a-string"]})])
    with pytest.raises(DriveError) as exc:
        client.fetch()
    assert "malformed file entry" in str(exc.value)


def test_list_non_json_body_is_safe_error():
    client = make_client(responses=[FakeResponse(payload={"access_token": "t"}),
                                    FakeResponse(json_ok=False)])
    with pytest.raises(DriveError) as exc:
        client.fetch()
    assert "non-JSON body" in str(exc.value)


def test_non_string_next_page_token_stops_pagination():
    """A malformed token must stop the loop, not trigger another request."""
    client = make_client(responses=[
        FakeResponse(payload={"access_token": "t"}),
        FakeResponse(payload={"files": [], "nextPageToken": {"not": "a string"}}),
    ])
    out = client.fetch()
    assert out["files"] == []
    assert len(client.session.calls) == 2      # token + one list call, no more


def test_files_field_may_be_absent():
    client = make_client(responses=[FakeResponse(payload={"access_token": "t"}),
                                    FakeResponse(payload={})])
    assert client.fetch()["files"] == []


# --- record coercion and URL construction ------------------------------------

def test_record_fields_are_coerced_to_text():
    client = make_client(responses=[
        FakeResponse(payload={"access_token": "t"}),
        FakeResponse(payload={"files": [{"id": 7, "name": None, "mimeType": ["x"],
                                         "modifiedTime": {}, "size": "not-a-number",
                                         "webViewLink": 42, "description": None}]}),
    ])
    rec = client.fetch()["files"][0]
    assert rec["id"] == "" and rec["name"] == "" and rec["mime_type"] == ""
    assert rec["modified_time"] == "" and rec["web_view_link"] == ""
    assert rec["description"] == ""
    assert rec["size_bytes"] is None           # unparsable size is unknown, not 0
    # a non-string id can never reach a URL path — the record says so honestly
    assert rec["content_state"] == "error"
    assert rec["fetch_error"] == "skipped: unusable file id"


def test_unusable_file_id_is_refused_without_a_request():
    client = make_client(responses=[
        FakeResponse(payload={"access_token": "t"}),
        FakeResponse(payload={"files": [{"id": "../../etc/passwd", "name": "x.md",
                                         "mimeType": "text/plain", "size": "2"}]}),
    ])
    out = client.fetch()
    rec = out["files"][0]
    assert rec["content_state"] == "error"
    assert rec["fetch_error"] == "skipped: unusable file id"
    assert len(client.session.calls) == 2      # no download was attempted


def test_download_url_is_built_on_the_pinned_drive_host():
    client = make_client(responses=[
        FakeResponse(payload={"access_token": "t"}),
        FakeResponse(payload={"files": [{"id": "f-1_a", "name": "a.md",
                                         "mimeType": "text/plain", "size": "5"}]}),
        FakeResponse(body=b"hello"),
    ])
    out = client.fetch()
    assert out["files"][0]["content"] == "hello"
    _, url, kw = client.session.calls[2]
    assert url == f"{DRIVE_BASE}/files/f-1_a"
    assert kw["headers"]["Authorization"].startswith("Bearer ")
