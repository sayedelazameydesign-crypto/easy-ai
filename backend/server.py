"""Development HTTP server: static site plus /api/status and /api/chat."""
from __future__ import annotations

import argparse
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from .app import ChatApplication
from .config import ChatConfig

MAX_BODY_BYTES = 64 * 1024


def make_handler(app: ChatApplication):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            # Serve only the generated public artifact, never the repository,
            # environment files, tests, or .git directory.
            super().__init__(*args, directory="_pages", **kwargs)

        def _origin_allowed(self) -> bool:
            origin = self.headers.get("Origin")
            if app.config.allowed_origins:
                # A configured browser deployment must send an exact allowlisted
                # Origin. Missing Origin is not treated as an authentication bypass.
                return origin in app.config.allowed_origins
            # Origin-less access is reserved for local development/CLI use.
            return origin is None

        def _json(self, code: int, payload: dict) -> None:
            body = json.dumps(payload).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            origin = self.headers.get("Origin")
            if origin and origin in app.config.allowed_origins:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path == "/api/status":
                if not self._origin_allowed():
                    return self._json(403, {"status": "invalid_request"})
                return self._json(*app.status())
            return super().do_GET()

        def do_OPTIONS(self):
            if self.path != "/api/chat" or not self._origin_allowed():
                return self._json(403 if self.path == "/api/chat" else 404,
                                  {"status": "invalid_request"})
            self.send_response(204)
            origin = self.headers.get("Origin")
            if origin:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Accept")
            self.send_header("Access-Control-Max-Age", "600")
            self.end_headers()

        def do_POST(self):
            if self.path != "/api/chat" or not self._origin_allowed():
                return self._json(403 if self.path == "/api/chat" else 404,
                                  {"status": "invalid_request"})
            content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
            if content_type != "application/json":
                return self._json(415, {"status": "invalid_request"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > MAX_BODY_BYTES:
                    raise ValueError
                payload = json.loads(self.rfile.read(length))
            except (ValueError, json.JSONDecodeError):
                return self._json(400, {"status": "invalid_request"})
            client_id = self.client_address[0]
            return self._json(*app.chat(payload, client_id))

        def log_message(self, format, *args):
            # Deliberately avoid request/body logging by default.
            return

    return Handler


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    config = ChatConfig.from_env()
    app = ChatApplication(config)
    ThreadingHTTPServer((args.host, args.port), make_handler(app)).serve_forever()


if __name__ == "__main__":
    main()
