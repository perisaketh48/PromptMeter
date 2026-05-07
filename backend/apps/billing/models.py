"""Plan, Subscription and Invoice models."""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Plan(models.Model):
    """A purchasable subscription tier."""

    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    # nullable = unlimited
    monthly_token_quota = models.PositiveBigIntegerField(null=True, blank=True)
    monthly_cost_cap_usd = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
    )
    max_keys = models.PositiveIntegerField(null=True, blank=True)
    features = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("sort_order", "monthly_price")

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"


class Subscription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        CANCELED = "canceled", _("Canceled")
        EXPIRED = "expired", _("Expired")
        PAST_DUE = "past_due", _("Past due")

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    plan = models.ForeignKey(
        Plan, on_delete=models.PROTECT, related_name="subscriptions",
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.ACTIVE,
    )
    started_at = models.DateTimeField(default=timezone.now)
    current_period_start = models.DateTimeField(default=timezone.now)
    current_period_end = models.DateTimeField()
    canceled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = (
            models.Index(fields=("status",)),
            models.Index(fields=("current_period_end",)),
        )

    def __str__(self) -> str:
        return f"Sub<{self.user_id}:{self.plan.code}:{self.status}>"


class Invoice(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", _("Open")
        PAID = "paid", _("Paid")
        VOID = "void", _("Void")

    subscription = models.ForeignKey(
        Subscription, on_delete=models.CASCADE, related_name="invoices",
    )
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default="USD")
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.OPEN,
    )
    issued_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-issued_at",)
        indexes = (
            models.Index(fields=("subscription", "-issued_at")),
            models.Index(fields=("status",)),
        )

    def __str__(self) -> str:
        return f"Invoice<{self.subscription_id}:{self.amount} {self.currency}>"
