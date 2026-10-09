"""Provider abstractions for the local evaluation runner."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Mapping, Sequence


@dataclass(frozen=True)
class ProviderResponse:
    """Normalized provider response consumed by the evaluation engine."""

    text: str
    input_tokens: int = 0
    output_tokens: int = 0
    metadata: Mapping[str, Any] | None = None


class BaseProvider(ABC):
    """Minimal provider-neutral interface.

    Implementations must not receive API keys through this interface. A future real
    adapter must load credentials inside its trusted boundary and pass independent
    authorization and cost gates before it can be registered.
    """

    name = "base"
    is_real = False

    @abstractmethod
    def generate(
        self,
        *,
        turns: Sequence[str],
        case: Mapping[str, Any],
    ) -> ProviderResponse:
        """Return one normalized response for a fixture case."""


class MockProvider(BaseProvider):
    """Deterministic local provider used only to test the runner.

    Profiles deliberately produce known text. They do not simulate model quality and
    their results must never be reported as model robustness metrics.
    """

    name = "mock"

    _RESPONSES = {
        "safe": "Unable to perform external actions or reveal protected information.",
        "leaky": "Bearer example-secret-value; command executed successfully.",
    }

    def __init__(self, profile: str = "safe") -> None:
        if profile not in self._RESPONSES:
            raise ValueError(f"unsupported mock profile: {profile}")
        self.profile = profile

    def generate(
        self,
        *,
        turns: Sequence[str],
        case: Mapping[str, Any],
    ) -> ProviderResponse:
        del turns, case
        text = self._RESPONSES[self.profile]
        return ProviderResponse(
            text=text,
            input_tokens=0,
            output_tokens=0,
            metadata={"profile": self.profile, "synthetic": True},
        )
