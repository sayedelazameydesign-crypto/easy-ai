from sync.redact import Redactor


def test_exact_secret_value_scrubbed():
    r = Redactor(secret_values=["s3cr3t-value-that-is-long-enough"])
    text, n = r.redact_text("the key is s3cr3t-value-that-is-long-enough ok")
    assert "s3cr3t-value-that-is-long-enough" not in text
    assert "[REDACTED:SECRET]" in text
    assert n == 1


def test_short_values_not_scrubbed_as_exact():
    r = Redactor(secret_values=["abc"])
    text, n = r.redact_text("abc def")
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
    text2, n2 = r.redact_text("order 1234567890123456")
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
