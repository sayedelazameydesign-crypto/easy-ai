"""Provider-neutral evaluation loop and structured reporting."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Mapping

from .providers import BaseProvider
from .validators import evaluate_invariant


DEFAULT_FIXTURE = (
    Path(__file__).parents[1] / "fixtures" / "robustness_eval.v1.json"
)


@dataclass(frozen=True)
class ExecutionPolicy:
    """Fail-closed limits for one local evaluation run."""

    allow_real_api: bool = False
    max_cases: int = 100
    max_total_tokens: int = 5_000

    def __post_init__(self) -> None:
        if self.max_cases < 1:
            raise ValueError("max_cases must be positive")
        if self.max_total_tokens < 0:
            raise ValueError("max_total_tokens must not be negative")


class EvaluationEngine:
    def __init__(self, provider: BaseProvider, policy: ExecutionPolicy | None = None):
        self.provider = provider
        self.policy = policy or ExecutionPolicy()
        if provider.is_real and not self.policy.allow_real_api:
            raise PermissionError("real provider execution is disabled")

    def run(self, fixture: Mapping[str, Any]) -> dict[str, Any]:
        cases = fixture.get("cases")
        if not isinstance(cases, list):
            raise ValueError("fixture cases must be a list")
        if len(cases) > self.policy.max_cases:
            raise ValueError("fixture exceeds the configured case limit")

        total_tokens = 0
        results = []
        for case in cases:
            response = self.provider.generate(turns=case["turns"], case=case)
            used_tokens = response.input_tokens + response.output_tokens
            if used_tokens < 0:
                raise ValueError("provider returned a negative token count")
            total_tokens += used_tokens
            if total_tokens > self.policy.max_total_tokens:
                raise RuntimeError("evaluation token cap exceeded")

            invariant_results = [
                evaluate_invariant(invariant, response.text)
                for invariant in case["invariants"]
            ]
            statuses = {result.status for result in invariant_results}
            if "failed" in statuses:
                status = "failed"
            elif "not_evaluated" in statuses:
                status = "inconclusive"
            else:
                status = "passed"

            results.append(
                {
                    "case_id": case["id"],
                    "status": status,
                    "invariants": [result.to_dict() for result in invariant_results],
                    "usage": {
                        "input_tokens": response.input_tokens,
                        "output_tokens": response.output_tokens,
                    },
                }
            )

        counts = {
            status: sum(result["status"] == status for result in results)
            for status in ("passed", "failed", "inconclusive")
        }
        return {
            "report_version": "1.0",
            "dataset_id": fixture.get("dataset_id"),
            "dataset_status": fixture.get("status"),
            "provider": self.provider.name,
            "provider_is_real": self.provider.is_real,
            "model_robustness_claim": False,
            "total_tokens": total_tokens,
            "counts": counts,
            "results": results,
        }


def load_evaluation_fixture(path: Path = DEFAULT_FIXTURE) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        fixture = json.load(handle)
    if not isinstance(fixture, dict):
        raise ValueError("fixture root must be an object")
    return fixture


def write_report(report: Mapping[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
