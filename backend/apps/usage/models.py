"""Usage records — append-only ledger of every billable AI call."""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class UsageRecord(models.Model):
    class Source(models.TextChoices):
        ESTIMATOR = "estimator", _("Estimator")
        PROXY = "proxy", _("Proxy")

    class Status(models.TextChoices):
        SUCCESS = "success", _("Success")
        ERROR = "error", _("Error")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="usage_records",
    )
    model = models.ForeignKey(
        "providers.AIModel",
        on_delete=models.PROTECT,
        related_name="usage_records",
    )
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    cost_usd = models.DecimalField(
        max_digits=14, decimal_places=8, default=Decimal("0"),
    )
    latency_ms = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.SUCCESS,
    )
    source = models.CharField(max_length=16, choices=Source.choices)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = (
            models.Index(fields=("user", "-created_at")),
            models.Index(fields=("model", "-created_at")),
            models.Index(fields=("source", "-created_at")),
            models.Index(fields=("status", "-created_at")),
        )

    def __str__(self) -> str:
        return f"Usage<{self.user_id}:{self.model_id}:{self.total_tokens}t>"
