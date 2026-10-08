import requests
import pytest

from backend.provider import OpenAIProvider, ProviderError, ProviderTimeout


class FakeResponse:
    def __init__(self, status_code=200, payload=None, json_error=None):
        self.status_code = status_code
        self.payload = payload
        self.json_error = json_error

    def json(self):
        if self.json_error:
            raise self.json_error
        return self.payload


class FakeSession:
    def __init__(self, response=None, error=None):
        self.response, self.error, self.calls = response, error, []

    def post(self, url, **kwargs):
        self.calls.append((url, kwargs))
        if self.error:
            raise self.error
        return self.response


def provider(session, key="TEST_API_KEY_NOT_REAL"):
    return OpenAIProvider(key, "test-model", timeout_seconds=3, session=session)


def test_builds_fixed_host_bounded_request_and_extracts_reply():
    session = FakeSession(FakeResponse(payload={
        "choices": [{"message": {"content": "provider response"}}]
    }))
    result = provider(session).complete(
        [{"role": "user", "content": "hello"}], max_output_chars=100)
    assert result == "provider response"
    url, kwargs = session.calls[0]
    assert url == OpenAIProvider.ENDPOINT
    assert kwargs["headers"]["Authorization"] == "Bearer TEST_API_KEY_NOT_REAL"
    assert kwargs["json"] == {
        "model": "test-model",
        "messages": [{"role": "user", "content": "hello"}],
        "max_completion_tokens": 50,
    }
    assert kwargs["timeout"] == (3, 3)


def test_response_is_capped_even_when_provider_exceeds_requested_budget():
    session = FakeSession(FakeResponse(payload={
        "choices": [{"message": {"content": "123456789"}}]
    }))
    assert provider(session).complete(
        [{"role": "user", "content": "x"}], max_output_chars=4) == "1234"
    assert session.calls[0][1]["json"]["max_completion_tokens"] == 2


@pytest.mark.parametrize("response", [
    FakeResponse(status_code=401, payload={"error": "do not expose"}),
    FakeResponse(payload=None, json_error=ValueError("bad json with secret")),
    FakeResponse(payload={}),
    FakeResponse(payload={"choices": []}),
    FakeResponse(payload={"choices": [{"message": {"content": ""}}]}),
])
def test_bad_provider_responses_raise_safe_errors(response):
    secret = "TEST_API_KEY_NOT_REAL"
    with pytest.raises(ProviderError) as caught:
        provider(FakeSession(response), secret).complete(
            [{"role": "user", "content": "x"}], max_output_chars=100)
    rendered = str(caught.value)
    assert secret not in rendered
    assert "do not expose" not in rendered
    assert "bad json" not in rendered


@pytest.mark.parametrize("error, expected", [
    (requests.Timeout("timeout details"), ProviderTimeout),
    (requests.ConnectionError("connection details"), ProviderError),
])
def test_transport_failures_are_mapped_without_internal_details(error, expected):
    with pytest.raises(expected) as caught:
        provider(FakeSession(error=error)).complete(
            [{"role": "user", "content": "x"}], max_output_chars=100)
    assert "details" not in str(caught.value)


def test_provider_and_config_repr_hide_credentials():
    from backend.config import ChatConfig
    secret = "TEST_API_KEY_NOT_REAL"
    assert secret not in repr(provider(FakeSession(), secret))
    assert secret not in repr(ChatConfig(api_key=secret))
