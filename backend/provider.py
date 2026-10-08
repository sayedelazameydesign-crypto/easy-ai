"""Model provider boundary and one fixed-host OpenAI adapter."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import ClassVar, Protocol

import requests


class ProviderError(RuntimeError):
    """Safe provider failure; never carries response bodies or credentials."""


class ProviderTimeout(ProviderError):
    pass


class ChatProvider(Protocol):
    def complete(self, messages: list[dict[str, str]], *, max_output_chars: int) -> str: ...


@dataclass
class OpenAIProvider:
    api_key: str = field(repr=False)
    model: str
    timeout_seconds: float = 20.0
    session: requests.Session | None = field(default=None, repr=False)

    ENDPOINT: ClassVar[str] = "https://api.openai.com/v1/chat/completions"
    MAX_COMPLETION_TOKENS: ClassVar[int] = 4096

    def complete(self, messages: list[dict[str, str]], *, max_output_chars: int) -> str:
        # Character and token counts are not equivalent. This conservative token
        # budget limits provider-side generation; the character slice below is a
        # separate response-contract guarantee.
        max_completion_tokens = max(1, min(
            self.MAX_COMPLETION_TOKENS, (max_output_chars + 1) // 2))
        post = self.session.post if self.session is not None else requests.post
        try:
            response = post(
                self.ENDPOINT,
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "messages": messages,
                    "max_completion_tokens": max_completion_tokens,
                },
                timeout=(self.timeout_seconds, self.timeout_seconds),
            )
        except requests.Timeout as exc:
            raise ProviderTimeout("provider request timed out") from exc
        except requests.RequestException as exc:
            raise ProviderError("provider connection failed") from exc
        if response.status_code != 200:
            raise ProviderError(f"provider returned HTTP {response.status_code}")
        try:
            text = response.json()["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise ProviderError("provider returned an invalid response") from exc
        if not isinstance(text, str) or not text.strip():
            raise ProviderError("provider returned an empty response")
        return text[:max_output_chars]
