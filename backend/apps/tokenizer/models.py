"""Persistent estimate history rows."""
from __future__ import annotations

from django.conf import settings
from django.db import models


class Estimate(models.Model):
    """A snapshot of one estimation request, frozen at compute time.

    Pricing is captured alongside the result so historical totals stay
    accurate even after an AIModel's prices change.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="estimates",
    )
    model = models.ForeignKey(
        "providers.AIModel",
        on_delete=models.PROTECT,
        related_name="estimates",
    )

    # Inputs
    input_text = models.TextField(blank=True)
    system_prompt = models.TextField(blank=True)
    expected_output_tokens = models.PositiveIntegerField(null=True, blank=True)

    # Computed (frozen)
    input_tokens = models.PositiveIntegerField()
    output_tokens = models.PositiveIntegerField()
    total_tokens = models.PositiveIntegerField()
    input_cost = models.DecimalField(max_digits=14, decimal_places=8)
    output_cost = models.DecimalField(max_digits=14, decimal_places=8)
    estimated_cost = models.DecimalField(max_digits=14, decimal_places=8)
    strategy = models.CharField(max_length=64)

    # Pricing snapshot
    input_price_at_estimate = models.DecimalField(max_digits=12, decimal_places=8)
    output_price_at_estimate = models.DecimalField(max_digits=12, decimal_places=8)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = (
            models.Index(fields=("user", "-created_at")),
            models.Index(fields=("model", "-created_at")),
        )

    def __str__(self) -> str:
        return (
            f"Estimate<{self.user_id}:{self.model_id} "
            f"{self.total_tokens}t / ${self.estimated_cost}>"
        )
