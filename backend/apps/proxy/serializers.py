"""Serializers for vendor credentials and the chat-proxy endpoint."""
from __future__ import annotations

from rest_framework import serializers

from apps.providers.models import AIModel, Provider

from .models import ProviderCredential


class ProviderCredentialSerializer(serializers.ModelSerializer):
    api_key = serializers.CharField(write_only=True, min_length=1, trim_whitespace=False)
    provider_slug = serializers.CharField(source="provider.slug", read_only=True)
    provider_name = serializers.CharField(source="provider.name", read_only=True)

    class Meta:
        model = ProviderCredential
        fields = (
            "id",
            "provider",
            "provider_slug",
            "provider_name",
            "label",
            "api_key",
            "last4",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "provider_slug", "provider_name", "last4", "created_at", "updated_at")

    def create(self, validated_data):
        api_key = validated_data.pop("api_key")
        cred = ProviderCredential(**validated_data)
        cred.set_key(api_key)
        cred.save()
        return cred

    def update(self, instance, validated_data):
        api_key = validated_data.pop("api_key", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if api_key:
            instance.set_key(api_key)
        instance.save()
        return instance


class ChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=("system", "user", "assistant"))
    content = serializers.CharField(allow_blank=True)


class ChatProxyRequestSerializer(serializers.Serializer):
    model_id = serializers.IntegerField(required=False, min_value=1)
    provider_slug = serializers.CharField(required=False)
    model_slug = serializers.CharField(required=False)
    credential_id = serializers.IntegerField(required=False, min_value=1)
    messages = ChatMessageSerializer(many=True)
    max_tokens = serializers.IntegerField(required=False, min_value=1)
    temperature = serializers.FloatField(required=False, min_value=0.0, max_value=2.0)

    def validate(self, attrs):
        request = self.context["request"]

        # Resolve target model
        qs = AIModel.objects.select_related("provider")
        model_id = attrs.get("model_id")
        if model_id:
            try:
                model = qs.get(pk=model_id)
            except AIModel.DoesNotExist as exc:
                raise serializers.ValidationError({"model_id": "Model not found."}) from exc
        else:
            provider_slug = attrs.get("provider_slug")
            model_slug = attrs.get("model_slug")
            if not (provider_slug and model_slug):
                raise serializers.ValidationError(
                    "Provide either model_id, or both provider_slug and model_slug.",
                )
            try:
                model = qs.get(provider__slug=provider_slug, slug=model_slug)
            except AIModel.DoesNotExist as exc:
                raise serializers.ValidationError(
                    "No AIModel matches the given provider_slug and model_slug.",
                ) from exc
        if not model.is_active:
            raise serializers.ValidationError({"model": "Model is currently inactive."})

        # Clamp max_tokens to the model's limit.
        max_tokens = attrs.get("max_tokens")
        if max_tokens is not None and max_tokens > model.max_output_tokens:
            attrs["max_tokens"] = model.max_output_tokens

        # Resolve credential.
        credential_id = attrs.get("credential_id")
        cred_qs = ProviderCredential.objects.filter(
            user=request.user, provider=model.provider, is_active=True,
        )
        if credential_id:
            try:
                credential = cred_qs.get(pk=credential_id)
            except ProviderCredential.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {"credential_id": "Credential not found for this provider."},
                ) from exc
        else:
            credential = cred_qs.order_by("-updated_at").first()
            if credential is None:
                raise serializers.ValidationError(
                    f"No active credential configured for provider '{model.provider.slug}'. "
                    "POST /api/v1/proxy/credentials/ to add one.",
                )

        attrs["model"] = model
        attrs["credential"] = credential
        return attrs


class ChatProxyResponseSerializer(serializers.Serializer):
    content = serializers.CharField()
    role = serializers.CharField()
    finish_reason = serializers.CharField(allow_null=True)
    model_id = serializers.IntegerField()
    model_slug = serializers.CharField()
    provider_slug = serializers.CharField()
    prompt_tokens = serializers.IntegerField()
    completion_tokens = serializers.IntegerField()
    total_tokens = serializers.IntegerField()
    latency_ms = serializers.IntegerField()
    cost_usd = serializers.DecimalField(max_digits=14, decimal_places=8)
    usage_record_id = serializers.IntegerField()
