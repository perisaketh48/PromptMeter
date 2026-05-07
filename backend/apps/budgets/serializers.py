"""Serializers for budgets, alerts, and notifications."""
from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from .models import Budget, BudgetAlert, Notification
from .services import current_spend, percent_used


class BudgetSerializer(serializers.ModelSerializer):
    spend_usd = serializers.SerializerMethodField()
    pct_used = serializers.SerializerMethodField()
    scope_model_slug = serializers.CharField(
        source="scope_model.slug", read_only=True, default=None,
    )

    class Meta:
        model = Budget
        fields = (
            "id",
            "name",
            "period",
            "cap_usd",
            "scope_model",
            "scope_model_slug",
            "threshold_50",
            "threshold_80",
            "threshold_100",
            "is_active",
            "spend_usd",
            "pct_used",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "spend_usd", "pct_used", "scope_model_slug", "created_at", "updated_at")

    def get_spend_usd(self, obj: Budget) -> str:
        return str(current_spend(obj))

    def get_pct_used(self, obj: Budget) -> str:
        return str(percent_used(obj).quantize(Decimal("0.01")))

    def validate_cap_usd(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError("cap_usd must be greater than 0.")
        return value


class BudgetAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetAlert
        fields = (
            "id",
            "budget",
            "threshold_pct",
            "period_start",
            "period_end",
            "actual_cost_usd",
            "triggered_at",
            "notified",
        )
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            "id",
            "kind",
            "title",
            "body",
            "metadata",
            "read_at",
            "created_at",
        )
        read_only_fields = fields
