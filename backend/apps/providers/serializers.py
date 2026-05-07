"""DRF serializers for providers and AI models."""
from __future__ import annotations

from rest_framework import serializers

from .models import AIModel, Capability, Provider, validate_capabilities


class ProviderSerializer(serializers.ModelSerializer):
    model_count = serializers.IntegerField(source="models.count", read_only=True)

    class Meta:
        model = Provider
        fields = (
            "id",
            "name",
            "slug",
            "logo_url",
            "is_active",
            "model_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "model_count", "created_at", "updated_at")


class AIModelSerializer(serializers.ModelSerializer):
    provider = serializers.PrimaryKeyRelatedField(queryset=Provider.objects.all())
    provider_slug = serializers.CharField(source="provider.slug", read_only=True)
    provider_name = serializers.CharField(source="provider.name", read_only=True)

    class Meta:
        model = AIModel
        fields = (
            "id",
            "provider",
            "provider_slug",
            "provider_name",
            "name",
            "slug",
            "input_price",
            "output_price",
            "context_window",
            "max_output_tokens",
            "capabilities",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "provider_slug",
            "provider_name",
            "created_at",
            "updated_at",
        )

    def validate_capabilities(self, value):
        validate_capabilities(value)
        return value

    def validate(self, attrs):
        instance = self.instance
        ctx = attrs.get(
            "context_window",
            getattr(instance, "context_window", None),
        )
        max_out = attrs.get(
            "max_output_tokens",
            getattr(instance, "max_output_tokens", None),
        )
        if ctx is not None and max_out is not None and max_out > ctx:
            raise serializers.ValidationError(
                {"max_output_tokens": "max_output_tokens cannot exceed context_window."},
            )

        provider = attrs.get("provider", getattr(instance, "provider", None))
        slug = attrs.get("slug", getattr(instance, "slug", None))
        if provider and slug:
            qs = AIModel.objects.filter(provider=provider, slug=slug)
            if instance is not None:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"slug": "This provider already has a model with that slug."},
                )
        return attrs


class CapabilityChoiceSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()

    @classmethod
    def all(cls):
        return [{"value": v, "label": str(l)} for v, l in Capability.choices]
