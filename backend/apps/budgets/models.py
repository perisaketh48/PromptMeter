"""Budget rules, alerts, and notifications."""
from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Budget(models.Model):
    class Period(models.TextChoices):
        DAILY = "daily", _("Daily")
        WEEKLY = "weekly", _("Weekly")
        MONTHLY = "monthly", _("Monthly")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="budgets",
    )
    name = models.CharField(max_length=100)
    period = models.CharField(
        max_length=16, choices=Period.choices, default=Period.MONTHLY,
    )
    cap_usd = models.DecimalField(max_digits=10, decimal_places=2)
    scope_model = models.ForeignKey(
        "providers.AIModel",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="budgets",
        help_text=_("Limit this budget to a single model. Leave empty for all models."),
    )
    threshold_50 = models.BooleanField(default=True)
    threshold_80 = models.BooleanField(default=True)
    threshold_100 = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = (
            models.Index(fields=("user", "is_active")),
        )
        constraints = (
            models.CheckConstraint(
                check=models.Q(cap_usd__gt=0),
                name="ck_budget_cap_positive",
            ),
        )

    def __str__(self) -> str:
        return f"Budget<{self.user_id}:{self.name}>"


class BudgetAlert(models.Model):
    budget = models.ForeignKey(
        Budget, on_delete=models.CASCADE, related_name="alerts",
    )
    threshold_pct = models.PositiveSmallIntegerField()
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    actual_cost_usd = models.DecimalField(max_digits=14, decimal_places=8)
    triggered_at = models.DateTimeField(auto_now_add=True)
    notified = models.BooleanField(default=False)

    class Meta:
        ordering = ("-triggered_at",)
        constraints = (
            models.UniqueConstraint(
                fields=("budget", "threshold_pct", "period_start"),
                name="uq_budget_alert_period_threshold",
            ),
        )
        indexes = (
            models.Index(fields=("budget", "-triggered_at")),
        )

    def __str__(self) -> str:
        return f"Alert<{self.budget_id}:{self.threshold_pct}%>"


class Notification(models.Model):
    class Kind(models.TextChoices):
        BUDGET_ALERT = "budget_alert", _("Budget Alert")
        QUOTA_WARNING = "quota_warning", _("Quota Warning")
        SYSTEM = "system", _("System")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    kind = models.CharField(max_length=32, choices=Kind.choices)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = (
            models.Index(fields=("user", "-created_at")),
            models.Index(fields=("user", "read_at")),
        )

    def __str__(self) -> str:
        return f"Notif<{self.user_id}:{self.kind}>"
