import pytest

from sync.crypto import MAGIC, VaultError, vault_decrypt, vault_encrypt


def test_roundtrip():
    blob = vault_encrypt("سلام يا عالم — hello".encode("utf-8"), "a-strong-passphrase-123")
    assert blob.startswith(MAGIC)
    assert vault_decrypt(blob, "a-strong-passphrase-123").decode("utf-8") == \
        "سلام يا عالم — hello"


def test_wrong_key_fails_without_detail_leak():
    blob = vault_encrypt(b"payload", "a-strong-passphrase-123")
    with pytest.raises(VaultError) as exc:
        vault_decrypt(blob, "another-strong-passphrase")
    assert "SYNC_VAULT_KEY" in str(exc.value) or "failed" in str(exc.value)


def test_tamper_detected():
    blob = bytearray(vault_encrypt(b"payload", "a-strong-passphrase-123"))
    blob[-1] ^= 0xFF
    with pytest.raises(VaultError):
        vault_decrypt(bytes(blob), "a-strong-passphrase-123")


def test_short_passphrase_refused():
    with pytest.raises(VaultError):
        vault_encrypt(b"x", "short")


def test_foreign_file_rejected():
    with pytest.raises(VaultError):
        vault_decrypt(b"NOT-OURS" + b"\x00" * 64, "a-strong-passphrase-123")
