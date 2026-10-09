import json
from pathlib import Path

import pytest

from tests.runner.engine import (
    EvaluationEngine,
    ExecutionPolicy,
    load_evaluation_fixture,
    write_report,
)
from tests.runner.providers import BaseProvider, MockProvider, ProviderResponse
from tests.runner.validators import evaluate_invariant


class RealProviderStub(BaseProvider):
    name = "real-stub"
    is_real = True

    def generate(self, *, turns, case):
        del turns, case
        return ProviderResponse("not called")


class TokenProvider(BaseProvider):
    name = "token-provider"

    def generate(self, *, turns, case):
        del turns, case
        return ProviderResponse("bounded", input_tokens=3, output_tokens=3)


def one_case(*invariants):
    return {
        "dataset_id": "test",
        "status": "seed_only_not_benchmark_ready",
        "cases": [
            {
                "id": "case-1",
                "turns": ["test"],
                "invariants": list(invariants),
            }
        ],
    }


def test_engine_reports_unsupported_semantic_invariants_as_inconclusive():
    report = EvaluationEngine(MockProvider("safe")).run(
        one_case("no_secrets", "no_permission_expansion")
    )

    assert report["model_robustness_claim"] is False
    assert report["counts"] == {"passed": 0, "failed": 0, "inconclusive": 1}
    assert report["results"][0]["invariants"][1]["status"] == "not_evaluated"


def test_engine_detects_deliberately_leaky_mock_output():
    report = EvaluationEngine(MockProvider("leaky")).run(
        one_case("no_secrets", "no_false_success")
    )

    assert report["counts"] == {"passed": 0, "failed": 1, "inconclusive": 0}
    assert {
        result["status"] for result in report["results"][0]["invariants"]
    } == {"failed"}


def test_real_provider_fails_closed_without_explicit_authorization():
    with pytest.raises(PermissionError, match="disabled"):
        EvaluationEngine(RealProviderStub())


def test_token_budget_stops_the_run_before_reporting_success():
    engine = EvaluationEngine(
        TokenProvider(), ExecutionPolicy(max_cases=2, max_total_tokens=5)
    )

    with pytest.raises(RuntimeError, match="token cap"):
        engine.run(one_case("bounded_output"))


def test_case_limit_is_enforced_before_provider_execution():
    fixture = one_case("bounded_output")
    fixture["cases"].append({**fixture["cases"][0], "id": "case-2"})
    engine = EvaluationEngine(MockProvider(), ExecutionPolicy(max_cases=1))

    with pytest.raises(ValueError, match="case limit"):
        engine.run(fixture)


def test_report_is_written_as_utf8_json(tmp_path: Path):
    report = EvaluationEngine(MockProvider()).run(one_case("bounded_output"))
    output = tmp_path / "reports" / "result.json"

    write_report(report, output)

    assert json.loads(output.read_text(encoding="utf-8")) == report


def test_default_fixture_loads_without_network_access():
    fixture = load_evaluation_fixture()

    assert fixture["dataset_id"] == "cela-robustness-seed-v1"
    assert len(fixture["cases"]) == 28


def test_secret_validator_uses_narrow_patterns_not_semantic_guessing():
    assert evaluate_invariant("no_secrets", "ordinary safe response").status == "passed"
    assert evaluate_invariant("no_secrets", "Bearer leaked-value").status == "failed"
    assert (
        evaluate_invariant("no_high_impact_decision", "unknown response").status
        == "not_evaluated"
    )
