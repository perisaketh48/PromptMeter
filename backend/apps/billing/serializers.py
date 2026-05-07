"""Serializers for billing resources."""
from rest_framework import serializers

from .models import Invoice, Plan, Subscription


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = (
            "id",
            "code",
            "name",
            "description",
            "monthly_price",
            "monthly_token_quota",
            "monthly_cost_cap_usd",
            "max_keys",
            "features",
            "is_active",
            "sort_order",
        )
        read_only_fields = fields


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    plan_code = serializers.CharField(source="plan.code", read_only=True)

    class Meta:
        model = Subscription
        fields = (
            "id",
            "plan",
            "plan_code",
            "status",
            "started_at",
            "current_period_start",
            "current_period_end",
            "canceled_at",
        )
        read_only_fields = fields


class ChangePlanSerializer(serializers.Serializer):
    plan_code = serializers.CharField()

    def validate_plan_code(self, value: str) -> str:
        if not Plan.objects.filter(code=value, is_active=True).exists():
            raise serializers.ValidationError("Plan not found or inactive.")
        return value


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = (
            "id",
            "subscription",
            "period_start",
            "period_end",
            "amount",
            "currency",
            "status",
            "issued_at",
            "paid_at",
        )
        read_only_fields = fields


class QuotaStatusSerializer(serializers.Serializer):
    used_tokens = serializers.IntegerField()
    token_quota = serializers.IntegerField(allow_null=True)
    tokens_remaining = serializers.IntegerField(allow_null=True)
    used_cost_usd = serializers.DecimalField(max_digits=14, decimal_places=8)
    cost_cap_usd = serializers.DecimalField(
        max_digits=10, decimal_places=2, allow_null=True,
    )
    cost_remaining_usd = serializers.DecimalField(
        max_digits=14, decimal_places=8, allow_null=True,
    )
    period_start = serializers.DateTimeField()
    period_end = serializers.DateTimeField()
    plan_code = serializers.CharField()
