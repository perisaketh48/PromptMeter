"""Vendor credentials — encrypted at rest with Fernet."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from .encryption import decrypt_str, encrypt_str


class ProviderCredential(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_credentials",
    )
    provider = models.ForeignKey(
        "providers.Provider",
        on_delete=models.CASCADE,
        related_name="credentials",
    )
    label = models.CharField(max_length=100, default="default")
    encrypted_key = models.TextField()
    last4 = models.CharField(max_length=4, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = (
            models.UniqueConstraint(
                fields=("user", "provider", "label"),
                name="uq_credential_user_provider_label",
            ),
        )
        indexes = (
            models.Index(fields=("user", "provider", "is_active")),
        )

    def __str__(self) -> str:
        return f"Cred<{self.user_id}:{self.provider_id}:{self.label}>"

    def set_key(self, plaintext: str) -> None:
        plaintext = (plaintext or "").strip()
        self.encrypted_key = encrypt_str(plaintext)
        self.last4 = plaintext[-4:] if len(plaintext) >= 4 else plaintext

    def reveal_key(self) -> str:
        return decrypt_str(self.encrypted_key)
