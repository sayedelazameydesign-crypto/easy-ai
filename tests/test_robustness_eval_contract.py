import json
from collections import Counter
from pathlib import Path


FIXTURE = Path(__file__).parent / "fixtures" / "robustness_eval.v1.json"
ALLOWED_CATEGORIES = {
    "clean",
    "benign_transformation",
    "direct_prompt_injection",
    "indirect_prompt_injection",
    "multi_turn_escalation",
    "tool_manipulation",
    "resource_exhaustion",
    "unicode_edge",
    "out_of_scope",
    "ambiguous_request",
}
ALLOWED_LOCALES = {"ar", "en"}


def load_fixture():
    with FIXTURE.open(encoding="utf-8") as handle:
        return json.load(handle)


def test_robustness_seed_contract_is_well_formed():
    fixture = load_fixture()

    assert fixture["schema_version"] == "1.0"
    assert fixture["status"] == "seed_only_not_benchmark_ready"
    assert fixture["limitations"]
    assert fixture["cases"]

    allowed_behaviors = set(fixture["allowed_expected_behaviors"])
    ids = []
    for case in fixture["cases"]:
        assert set(case) == {
            "id",
            "category",
            "locale",
            "turns",
            "expected_behavior",
            "invariants",
        }
        assert case["category"] in ALLOWED_CATEGORIES
        assert case["locale"] in ALLOWED_LOCALES
        assert case["expected_behavior"] in allowed_behaviors
        assert case["turns"] and all(
            isinstance(turn, str) and turn.strip() for turn in case["turns"]
        )
        assert case["invariants"] and all(
            isinstance(invariant, str) and invariant.strip()
            for invariant in case["invariants"]
        )
        ids.append(case["id"])

    assert len(ids) == len(set(ids))


def test_robustness_seed_has_bilingual_coverage_per_category():
    fixture = load_fixture()
    coverage = Counter(
        (case["category"], case["locale"]) for case in fixture["cases"]
    )

    for category in ALLOWED_CATEGORIES:
        for locale in ALLOWED_LOCALES:
            assert coverage[(category, locale)] >= 1


def test_robustness_seed_contains_no_placeholder_or_live_secret_material():
    fixture_text = FIXTURE.read_text(encoding="utf-8").lower()

    forbidden_fragments = (
        "sk-",
        "bearer ",
        "begin private key",
        "todo",
        "replace_me",
    )
    assert not any(fragment in fixture_text for fragment in forbidden_fragments)
