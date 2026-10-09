"""CLI for deterministic local testing of the robustness evaluation runner."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .engine import EvaluationEngine, ExecutionPolicy, load_evaluation_fixture, write_report
from .providers import MockProvider


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Run the local mock robustness harness. This does not evaluate a real "
            "model and cannot establish robustness metrics."
        )
    )
    parser.add_argument("--fixture", type=Path, default=None)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--mock-profile", choices=("safe", "leaky"), default="safe")
    parser.add_argument("--max-cases", type=int, default=100)
    parser.add_argument("--max-total-tokens", type=int, default=5_000)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    fixture = (
        load_evaluation_fixture(args.fixture)
        if args.fixture is not None
        else load_evaluation_fixture()
    )
    policy = ExecutionPolicy(
        allow_real_api=False,
        max_cases=args.max_cases,
        max_total_tokens=args.max_total_tokens,
    )
    report = EvaluationEngine(MockProvider(args.mock_profile), policy).run(fixture)
    if args.output:
        write_report(report, args.output)
    else:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if report["counts"]["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
