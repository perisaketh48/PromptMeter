"""Serializers for usage records and analytics."""
from rest_framework import serializers

from .models import UsageRecord


class UsageRecordSerializer(serializers.ModelSerializer):
    model_slug = serializers.CharField(source="model.slug", read_only=True)
    model_name = serializers.CharField(source="model.name", read_only=True)
    provider_slug = serializers.CharField(source="model.provider.slug", read_only=True)

    class Meta:
        model = UsageRecord
        fields = (
            "id",
            "model",
            "model_slug",
            "model_name",
            "provider_slug",
            "prompt_tokens",
            "completion_tokens",
            "total_tokens",
            "cost_usd",
            "latency_ms",
            "status",
            "source",
            "error_message",
            "created_at",
        )
        read_only_fields = fields


class UsageSummarySerializer(serializers.Serializer):
    start = serializers.DateTimeField()
    end = serializers.DateTimeField()
    total_calls = serializers.IntegerField()
    total_tokens = serializers.IntegerField()
    prompt_tokens = serializers.IntegerField()
    completion_tokens = serializers.IntegerField()
    total_cost_usd = serializers.DecimalField(max_digits=14, decimal_places=8)


class UsageByDaySerializer(serializers.Serializer):
    day = serializers.DateField()
    calls = serializers.IntegerField()
    tokens = serializers.IntegerField()
    cost_usd = serializers.DecimalField(max_digits=14, decimal_places=8)


class UsageByModelSerializer(serializers.Serializer):
    model_id = serializers.IntegerField()
    model_slug = serializers.CharField()
    model_name = serializers.CharField()
    provider_slug = serializers.CharField()
    provider_name = serializers.CharField()
    calls = serializers.IntegerField()
    tokens = serializers.IntegerField()
    cost_usd = serializers.DecimalField(max_digits=14, decimal_places=8)
