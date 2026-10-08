import http.client
import json
import threading
from contextlib import contextmanager
from http.server import ThreadingHTTPServer

from backend.app import ChatApplication
from backend.config import ChatConfig
from backend.server import make_handler


class Provider:
    def complete(self, messages, *, max_output_chars):
        return "ok"


@contextmanager
def server(origins=()):
    app = ChatApplication(ChatConfig(allowed_origins=origins), provider=Provider())
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(app))
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield httpd.server_address[1]
    finally:
        httpd.shutdown()
        thread.join()
        httpd.server_close()


def request(port, method="POST", headers=None, body=None):
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=2)
    connection.request(method, "/api/chat", body=body, headers=headers or {})
    response = connection.getresponse()
    payload = response.read()
    connection.close()
    return response.status, dict(response.getheaders()), payload


def valid_body():
    return json.dumps({"messages": [{"role": "user", "content": "hello"}]})


def test_rejects_unsupported_content_type_before_provider():
    with server() as port:
        status, _, payload = request(port, headers={"Content-Type": "text/plain"}, body=valid_body())
    assert status == 415
    assert json.loads(payload) == {"status": "invalid_request"}


def test_local_originless_request_is_allowed_only_without_origin_configuration():
    headers = {"Content-Type": "application/json"}
    with server() as port:
        assert request(port, headers=headers, body=valid_body())[0] == 200
    with server(("https://app.example",)) as port:
        assert request(port, headers=headers, body=valid_body())[0] == 403


def test_exact_origin_and_preflight_are_supported_without_trusting_forwarded_ip():
    origin = "https://app.example"
    with server((origin,)) as port:
        headers = {
            "Content-Type": "application/json",
            "Origin": origin,
            "X-Forwarded-For": "203.0.113.99",
        }
        status, response_headers, _ = request(port, headers=headers, body=valid_body())
        assert status == 200
        assert response_headers["Access-Control-Allow-Origin"] == origin
        preflight_status, preflight_headers, _ = request(
            port, method="OPTIONS", headers={"Origin": origin})
        assert preflight_status == 204
        assert preflight_headers["Access-Control-Allow-Methods"] == "POST, OPTIONS"


def test_wrong_origin_is_rejected():
    with server(("https://app.example",)) as port:
        status, _, _ = request(port, headers={
            "Content-Type": "application/json",
            "Origin": "https://evil.example",
        }, body=valid_body())
    assert status == 403
