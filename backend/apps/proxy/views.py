"""Proxy endpoints — credentials CRUD + chat forwarder."""
from __future__ import annotations

from decimal import Decimal

from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from apps.billing.services import QuotaExceeded, assert_within_quota
from apps.budgets.services import evaluate_all_for_user
from apps.usage.models import UsageRecord
from apps.usage.services import record_usage

from .models import ProviderCredential
from .serializers import (
    ChatProxyRequestSerializer,
    ChatProxyResponseSerializer,
    ProviderCredentialSerializer,
)
from .services import ProxyError, dispatch


class ProviderCredentialViewSet(viewsets.ModelViewSet):
    """User-owned vendor API keys (encrypted at rest)."""

    serializer_class = ProviderCredentialSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return ProviderCredential.objects.filter(user=self.request.user).select_related("provider")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


def _compute_cost(model, prompt_tokens: int, completion_tokens: int) -> Decimal:
    thousand = Decimal(1000)
    in_cost = (Decimal(prompt_tokens) / thousand) * model.input_price
    out_cost = (Decimal(completion_tokens) / thousand) * model.output_price
    return (in_cost + out_cost).quantize(Decimal("0.00000001"))


class ChatProxyView(APIView):
    """POST a chat request, forward it to the vendor, log usage, return result."""

    permission_classes = (permissions.IsAuthenticated,)
    throttle_classes = (UserRateThrottle, ScopedRateThrottle)
    throttle_scope = "proxy_chat"
    serializer_class = ChatProxyRequestSerializer

    def post(self, request):
        req = self.serializer_class(data=request.data, context={"request": request})
        req.is_valid(raise_exception=True)

        model = req.validated_data["model"]
        credential = req.validated_data["credential"]
        messages = [
            {"role": m["role"], "content": m["content"]}
            for m in req.validated_data["messages"]
        ]

        # Coarse pre-check: refuse the call up front if the user is already at quota.
        try:
            assert_within_quota(request.user)
        except QuotaExceeded as exc:
            return Response(
                {"detail": exc.reason, "code": "quota_exceeded"},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        try:
            api_key = credential.reveal_key()
        except Exception:  # noqa: BLE001
            return Response(
                {"detail": "Stored credential could not be decrypted."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            result = dispatch(
                provider_slug=model.provider.slug,
                api_key=api_key,
                model_slug=model.slug,
                messages=messages,
                max_tokens=req.validated_data.get("max_tokens"),
                temperature=req.validated_data.get("temperature"),
            )
        except ProxyError as exc:
            record_usage(
                user=request.user,
                model=model,
                prompt_tokens=0,
                completion_tokens=0,
                cost_usd=Decimal("0"),
                source=UsageRecord.Source.PROXY,
                latency_ms=None,
                status=UsageRecord.Status.ERROR,
                error_message=str(exc)[:1000],
            )
            return Response(
                {"detail": str(exc), "code": "vendor_error"},
                status=exc.status_code,
            )

        cost = _compute_cost(model, result.prompt_tokens, result.completion_tokens)
        record = record_usage(
            user=request.user,
            model=model,
            prompt_tokens=result.prompt_tokens,
            completion_tokens=result.completion_tokens,
            cost_usd=cost,
            source=UsageRecord.Source.PROXY,
            latency_ms=result.latency_ms,
            status=UsageRecord.Status.SUCCESS,
        )
        # Re-evaluate budgets and emit notifications/alerts as needed.
        evaluate_all_for_user(request.user)

        payload = ChatProxyResponseSerializer(
            {
                "content": result.content,
                "role": result.role,
                "finish_reason": result.finish_reason,
                "model_id": model.id,
                "model_slug": model.slug,
                "provider_slug": model.provider.slug,
                "prompt_tokens": result.prompt_tokens,
                "completion_tokens": result.completion_tokens,
                "total_tokens": result.total_tokens,
                "latency_ms": result.latency_ms,
                "cost_usd": cost,
                "usage_record_id": record.id,
            },
        )
        return Response(payload.data, status=status.HTTP_200_OK)
