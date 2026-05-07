"""Serializers for the token estimation endpoints."""
from __future__ import annotations

from rest_framework import serializers

from apps.providers.models import AIModel

from .models import Estimate


class EstimateRequestSerializer(serializers.Serializer):
    """Either ``model_id`` *or* (``provider_slug`` + ``model_slug``) must be given."""

    model_id = serializers.IntegerField(required=False, min_value=1)
    provider_slug = serializers.CharField(required=False, allow_blank=False)
    model_slug = serializers.CharField(required=False, allow_blank=False)
    input_text = serializers.CharField(required=False, allow_blank=True, default="")
    system_prompt = serializers.CharField(required=False, allow_blank=True, default="")
    expected_output_tokens = serializers.IntegerField(required=False, min_value=0)
    save_history = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        model_id = attrs.get("model_id")
        provider_slug = attrs.get("provider_slug")
        model_slug = attrs.get("model_slug")

        qs = AIModel.objects.select_related("provider")
        if model_id:
            try:
                model = qs.get(pk=model_id)
            except AIModel.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {"model_id": "Model not found."}
                ) from exc
        elif provider_slug and model_slug:
            try:
                model = qs.get(provider__slug=provider_slug, slug=model_slug)
            except AIModel.DoesNotExist as exc:
                raise serializers.ValidationError(
                    "No AIModel matches the given provider_slug and model_slug."
                ) from exc
        else:
            raise serializers.ValidationError(
                "Provide either model_id, or both provider_slug and model_slug.",
            )

        if not model.is_active:
            raise serializers.ValidationError(
                {"model": "This model is currently inactive."},
            )

        eot = attrs.get("expected_output_tokens")
        if eot is not None and eot > model.max_output_tokens:
            raise serializers.ValidationError(
                {
                    "expected_output_tokens": (
                        f"Cannot exceed model.max_output_tokens "
                        f"({model.max_output_tokens})."
                    ),
                },
            )

        attrs["model"] = model
        return attrs


class EstimateResponseSerializer(serializers.Serializer):
    model_id = serializers.IntegerField()
    model_slug = serializers.CharField()
    model_name = serializers.CharField()
    provider_slug = serializers.CharField()
    input_tokens = serializers.IntegerField()
    output_tokens = serializers.IntegerField()
    total_tokens = serializers.IntegerField()
    input_cost = serializers.DecimalField(max_digits=14, decimal_places=8)
    output_cost = serializers.DecimalField(max_digits=14, decimal_places=8)
    estimated_cost = serializers.DecimalField(max_digits=14, decimal_places=8)
    strategy = serializers.CharField()
    saved_id = serializers.IntegerField(allow_null=True, required=False)


class EstimateHistorySerializer(serializers.ModelSerializer):
    model_slug = serializers.CharField(source="model.slug", read_only=True)
    model_name = serializers.CharField(source="model.name", read_only=True)
    provider_slug = serializers.CharField(source="model.provider.slug", read_only=True)

    class Meta:
        model = Estimate
        fields = (
            "id",
            "model",
            "model_slug",
            "model_name",
            "provider_slug",
            "input_text",
            "system_prompt",
            "expected_output_tokens",
            "input_tokens",
            "output_tokens",
            "total_tokens",
            "input_cost",
            "output_cost",
            "estimated_cost",
            "input_price_at_estimate",
            "output_price_at_estimate",
            "strategy",
            "created_at",
        )
        read_only_fields = fields
