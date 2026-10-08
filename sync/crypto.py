"""Vault crypto — AES-256-GCM with a scrypt-derived key.

Blob layout::

    MAGIC(7) | salt(16) | nonce(12) | ciphertext+GCM tag

The magic header is bound as AAD, so a truncated or foreign blob fails loudly.
The passphrase comes from ``SYNC_VAULT_KEY`` (GitHub secret / env) and is
never written anywhere.
"""
from __future__ import annotations

import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

MAGIC = b"EASYAI\x01"
_SALT_LEN = 16
_NONCE_LEN = 12
CIPHER = "AES-256-GCM"
KDF = "scrypt(n=2^14,r=8,p=1)"


class VaultError(RuntimeError):
    pass


def _derive_key(passphrase: str, salt: bytes) -> bytes:
    if not passphrase or len(passphrase) < 16:
        raise VaultError("vault passphrase too short (min 16 chars)")
    kdf = Scrypt(salt=salt, length=32, n=2**14, r=8, p=1)
    return kdf.derive(passphrase.encode("utf-8"))


def vault_encrypt(plaintext: bytes, passphrase: str) -> bytes:
    salt = os.urandom(_SALT_LEN)
    nonce = os.urandom(_NONCE_LEN)
    key = _derive_key(passphrase, salt)
    ct = AESGCM(key).encrypt(nonce, plaintext, MAGIC)
    return MAGIC + salt + nonce + ct


def vault_decrypt(blob: bytes, passphrase: str) -> bytes:
    if not blob.startswith(MAGIC):
        raise VaultError("not an easy-ai vault file (bad magic)")
    off = len(MAGIC)
    salt = blob[off:off + _SALT_LEN]
    nonce = blob[off + _SALT_LEN:off + _SALT_LEN + _NONCE_LEN]
    ct = blob[off + _SALT_LEN + _NONCE_LEN:]
    if len(salt) < _SALT_LEN or len(nonce) < _NONCE_LEN or not ct:
        raise VaultError("vault file truncated")
    key = _derive_key(passphrase, salt)
    try:
        return AESGCM(key).decrypt(nonce, ct, MAGIC)
    except Exception as exc:  # InvalidTag and friends — never leak details
        raise VaultError("decryption failed: wrong SYNC_VAULT_KEY or tampered file") from exc
