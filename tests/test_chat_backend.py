from backend.app import ChatApplication, SlidingWindowLimiter, validate_payload
from backend.config import ChatConfig
from backend.provider import ProviderError, ProviderTimeout


class FakeProvider:
    def __init__(self, result="real adapter reply", error=None):
        self.result, self.error, self.calls = result, error, []

    def complete(self, messages, *, max_output_chars):
        self.calls.append(messages)
        if self.error:
            raise self.error("safe failure")
        return self.result[:max_output_chars]


def config(**changes):
    values = ChatConfig(provider="openai", model="test-model", api_key="server-secret")
    return ChatConfig(**{**values.__dict__, **changes})


def test_valid_request_returns_provider_reply():
    provider = FakeProvider("reply from adapter")
    app = ChatApplication(config(), provider=provider)
    code, body = app.chat({"messages": [{"role": "user", "content": "hello"}]}, "client")
    assert (code, body) == (200, {"status": "ok", "reply": "reply from adapter"})
    assert provider.calls


def test_missing_configuration_is_explicit():
    app = ChatApplication(ChatConfig())
    assert app.status() == (200, {"status": "not_configured", "chat": "unavailable"})
    assert app.chat({"messages": [{"role": "user", "content": "hello"}]}, "c") == (
        503, {"status": "not_configured"})


def test_invalid_and_oversized_requests_are_rejected_without_provider_call():
    provider = FakeProvider()
    app = ChatApplication(config(max_message_chars=5), provider=provider)
    for payload in ({}, {"messages": []},
                    {"messages": [{"role": "system", "content": "x"}]},
                    {"messages": [{"role": "user", "content": "too long"}]}):
        code, body = app.chat(payload, "c")
        assert (code, body) == (400, {"status": "invalid_request"})
    assert not provider.calls


def test_provider_timeout_and_failure_are_safe():
    for error, expected in ((ProviderTimeout, (504, {"status": "provider_timeout"})),
                            (ProviderError, (502, {"status": "provider_error"}))):
        app = ChatApplication(config(), provider=FakeProvider(error=error))
        code, body = app.chat({"messages": [{"role": "user", "content": "hello"}]}, "c")
        assert (code, body) == expected
        rendered = repr(body)
        assert "server-secret" not in rendered
        assert "safe failure" not in rendered


def test_rate_limit_is_enforced():
    provider = FakeProvider()
    limiter = SlidingWindowLimiter(limit=1, window_seconds=60)
    app = ChatApplication(config(), provider=provider, limiter=limiter)
    payload = {"messages": [{"role": "user", "content": "hello"}]}
    assert app.chat(payload, "c")[0] == 200
    assert app.chat(payload, "c") == (429, {"status": "rate_limited"})


def test_output_is_capped():
    app = ChatApplication(config(max_output_chars=4), provider=FakeProvider("123456"))
    assert app.chat({"messages": [{"role": "user", "content": "x"}]}, "c")[1]["reply"] == "1234"


def test_environment_secret_does_not_appear_in_config_repr_requirement():
    # The application never logs config; API responses contain status names only.
    app = ChatApplication(config(api_key="TOP_SECRET"), provider=FakeProvider(error=ProviderError))
    _, body = app.chat({"messages": [{"role": "user", "content": "x"}]}, "c")
    assert "TOP_SECRET" not in str(body)
