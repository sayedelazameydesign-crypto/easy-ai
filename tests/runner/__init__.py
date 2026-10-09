"""Provider-neutral local robustness evaluation runner.

This package evaluates the runner contract with deterministic local providers. It
must not be imported as proof that a language model has been evaluated.
"""

from .engine import EvaluationEngine, load_evaluation_fixture
from .providers import BaseProvider, MockProvider, ProviderResponse

__all__ = [
    "BaseProvider",
    "EvaluationEngine",
    "MockProvider",
    "ProviderResponse",
    "load_evaluation_fixture",
]
