"""Symmetric encryption for vendor API keys.

Uses Fernet (AES-128-CBC + HMAC-SHA256) with a key supplied via the
``FERNET_KEY`` environment variable. Keys never leave the server in
plaintext after they're stored.
"""
from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = getattr(settings, "FERNET_KEY", "") or ""
    if not key:
        raise ImproperlyConfigured(
            "FERNET_KEY is not set. Generate one with "
            "`python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"` "
            "and set it in backend/.env."
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_str(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("ascii")


def decrypt_str(token: str) -> str:
    return _fernet().decrypt(token.encode("ascii")).decode("utf-8")
