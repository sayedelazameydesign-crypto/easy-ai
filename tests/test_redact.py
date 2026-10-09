from sync.redact import Redactor


def test_exact_secret_value_scrubbed():
    r = Redactor(secret_values=["s3cr3t-value-that-is-long-enough"])
    text, n = r.redact_text("the key is s3cr3t-value-that-is-long-enough ok")
    assert "s3cr3t-value-that-is-long-enough" not in text
    assert "[REDACTED:SECRET]" in text
    assert n == 1


def test_short_values_not_scrubbed_as_exact():
    r = Redactor(secret_values=["abc"])
    _, n = r.redact_text("abc def")
    assert n == 0


def test_known_token_shapes():
    r = Redactor()
    samples = [
        "ghp_" + "A" * 36,
        "github_pat_" + "B" * 22,
        "sk-" + "C" * 20,
        "secret_" + "D" * 24,
        "AIza" + "E" * 35,
        "AKIA" + "F" * 16,
        "ya29." + "G" * 30,
    ]
    for token in samples:
        text, n = r.redact_text(f"leaked {token} here")
        assert token not in text, token
        assert n >= 1


def test_jwt_and_bearer():
    r = Redactor()
    jwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMaFQUxB"
    text, n = r.redact_text(f"auth {jwt} and Bearer abcdefghijklmnop1234")
    assert jwt not in text
    assert "abcdefghijklmnop1234" not in text
    assert n >= 2


def test_email_and_phone():
    r = Redactor()
    text, n = r.redact_text("mail me at john.doe@example.com or +20 100 123 4567")
    assert "john.doe@example.com" not in text
    assert "+20 100 123 4567" not in text
    assert n >= 2


def test_card_luhn():
    r = Redactor()
    text, n = r.redact_text("card 4111 1111 1111 1111 on file")
    assert "4111" not in text
    assert n == 1
    # a non-Luhn number sequence is left alone
    _, n2 = r.redact_text("order 1234567890123456")
    assert n2 == 0


def test_private_key_block():
    r = Redactor()
    pem = "-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----"
    text, n = r.redact_text(f"before {pem} after")
    assert "MIIEv" not in text
    assert n >= 1


def test_nested_obj():
    r = Redactor(secret_values=["hunter2hunter2"])
    obj = {"a": ["mail x@y.com", {"b": "pass hunter2hunter2"}], "n": 5, "ok": True}
    clean, n = r.redact_obj(obj)
    assert "hunter2hunter2" not in str(clean)
    assert "x@y.com" not in str(clean)
    assert clean["n"] == 5 and clean["ok"] is True
    assert n >= 2


# --- structure and bookkeeping ----------------------------------------------

def test_non_string_scalars_pass_through_unchanged():
    r = Redactor()
    obj = {"n": 5, "f": 1.5, "t": True, "none": None}
    clean, n = r.redact_obj(obj)
    assert clean == obj and n == 0
    assert isinstance(clean["t"], bool)          # not coerced to a string


def test_tuples_become_lists_but_keep_their_content():
    r = Redactor(secret_values=["hunter2hunter2"])
    clean, n = r.redact_obj(("mail x@y.com", "pass hunter2hunter2"))
    assert isinstance(clean, list)
    assert "hunter2hunter2" not in str(clean)
    assert n == 2


def test_dict_keys_are_redacted_too():
    r = Redactor()
    clean, n = r.redact_obj({"john@example.com": "value"})
    assert list(clean) == ["[REDACTED:EMAIL]"]
    assert clean["[REDACTED:EMAIL]"] == "value"
    assert n == 1


def test_deeply_nested_structure_is_fully_walked():
    r = Redactor(secret_values=["s3cr3t-value-that-is-long-enough"])
    obj = {"a": {"b": {"c": [{"d": "s3cr3t-value-that-is-long-enough"}]}}}
    clean, n = r.redact_obj(obj)
    assert "s3cr3t-value-that-is-long-enough" not in str(clean)
    assert n == 1


def test_total_counter_accumulates_across_calls():
    r = Redactor()
    assert r.total == 0
    _, n1 = r.redact_text("mail a@b.com")
    _, n2 = r.redact_text("mail c@d.com")
    assert r.total == n1 + n2 == 2


def test_extra_patterns_are_uppercased_kinds():
    r = Redactor(extra_patterns={"owner id": r"OWNER-\d{6}"})
    text, n = r.redact_text("ticket OWNER-123456 open")
    assert "OWNER-123456" not in text
    assert "[REDACTED:OWNER ID]" in text
    assert n == 1


def test_card_lengths_and_checksums_outside_the_rules_are_left_alone():
    r = Redactor()
    _, n = r.redact_text("short 12345678901 end")            # 11 digits: too short
    assert n == 0
    _, n2 = r.redact_text("reference 1234-5678-1234-5678")    # 16 digits, fails Luhn
    assert n2 == 0
    _, n3 = r.redact_text("card 4111-1111-1111-1112")         # right length, bad checksum
    assert n3 == 0
    text4, n4 = r.redact_text("card 4111-1111-1111-1111")     # separator-insensitive
    assert n4 == 1 and "4111" not in text4


def test_redactor_is_idempotent():
    r = Redactor()
    once, _ = r.redact_text("mail john@example.com, card 4111 1111 1111 1111")
    twice, n = r.redact_text(once)
    assert twice == once
    assert n == 0                                   # nothing left to scrub
