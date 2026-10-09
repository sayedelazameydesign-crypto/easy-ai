"""Framework-free chat application logic, independently testable from HTTP."""
from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass, field

from .config import ChatConfig
from .provider import ChatProvider, OpenAIProvider, ProviderError, ProviderTimeout

ALLOWED_ROLES = {"user", "assistant"}


class InvalidRequest(ValueError):
    pass


@dataclass
class SlidingWindowLimiter:
    limit: int
    window_seconds: int
    clock: callable = time.monotonic
    _requests: dict[str, deque] = field(default_factory=lambda: defaultdict(deque))

    def allow(self, client_id: str) -> bool:
        now = self.clock()
        entries = self._requests[client_id]
        while entries and entries[0] <= now - self.window_seconds:
            entries.popleft()
        if len(entries) >= self.limit:
            return False
        entries.append(now)
        return True


def validate_payload(payload: object, config: ChatConfig) -> list[dict[str, str]]:
    if not isinstance(payload, dict) or set(payload) != {"messages"}:
        raise InvalidRequest("body must contain only messages")
    messages = payload["messages"]
    if not isinstance(messages, list) or not 1 <= len(messages) <= config.max_messages:
        raise InvalidRequest("invalid message count")
    clean: list[dict[str, str]] = []
    total = 0
    for message in messages:
        if not isinstance(message, dict) or set(message) != {"role", "content"}:
            raise InvalidRequest("invalid message shape")
        role, content = message["role"], message["content"]
        if role not in ALLOWED_ROLES or not isinstance(content, str) or not content.strip():
            raise InvalidRequest("invalid message fields")
        if len(content) > config.max_message_chars:
            raise InvalidRequest("message too long")
        total += len(content)
        clean.append({"role": role, "content": content})
    if total > config.max_total_chars:
        raise InvalidRequest("conversation too long")
    if clean[-1]["role"] != "user":
        raise InvalidRequest("last message must be from user")
    return clean


class ChatApplication:
    def __init__(self, config: ChatConfig, provider: ChatProvider | None = None,
                 limiter: SlidingWindowLimiter | None = None):
        self.config = config
        self.provider = provider
        if provider is None and config.configured:
            self.provider = OpenAIProvider(config.api_key, config.model, config.timeout_seconds)
        self.limiter = limiter or SlidingWindowLimiter(
            config.rate_limit_requests, config.rate_limit_window_seconds)

    def status(self) -> tuple[int, dict]:
        return 200, {"status": "ok" if self.provider else "not_configured",
                     "chat": "implemented" if self.provider else "unavailable"}

    def chat(self, payload: object, client_id: str) -> tuple[int, dict]:
        if not self.provider:
            return 503, {"status": "not_configured"}
        if not self.limiter.allow(client_id):
            return 429, {"status": "rate_limited"}
        try:
            messages = validate_payload(payload, self.config)
            reply = self.provider.complete(messages, max_output_chars=self.config.max_output_chars)
            return 200, {"status": "ok", "reply": reply}
        except InvalidRequest:
            return 400, {"status": "invalid_request"}
        except ProviderTimeout:
            return 504, {"status": "provider_timeout"}
        except ProviderError:
            return 502, {"status": "provider_error"}
