"""Token estimation API endpoints."""
from __future__ import annotations

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from .models import Estimate
from .serializers import (
    EstimateHistorySerializer,
    EstimateRequestSerializer,
    EstimateResponseSerializer,
)
from .services import estimate as estimate_service


class EstimateView(APIView):
    """POST a prompt + model selector, get tokens & cost back."""

    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = EstimateRequestSerializer
    throttle_classes = (UserRateThrottle, ScopedRateThrottle)
    throttle_scope = "tokenizer_estimate"

    def post(self, request):
        req = self.serializer_class(data=request.data)
        req.is_valid(raise_exception=True)

        model = req.validated_data["model"]
        result = estimate_service(
            model=model,
            input_text=req.validated_data.get("input_text", ""),
            system_prompt=req.validated_data.get("system_prompt", ""),
            expected_output_tokens=req.validated_data.get("expected_output_tokens"),
        )

        saved_id = None
        if req.validated_data.get("save_history"):
            saved_id = Estimate.objects.create(
                user=request.user,
                model=model,
                input_text=req.validated_data.get("input_text", ""),
                system_prompt=req.validated_data.get("system_prompt", ""),
                expected_output_tokens=req.validated_data.get("expected_output_tokens"),
                input_tokens=result.input_tokens,
                output_tokens=result.output_tokens,
                total_tokens=result.total_tokens,
                input_cost=result.input_cost,
                output_cost=result.output_cost,
                estimated_cost=result.estimated_cost,
                strategy=result.strategy,
                input_price_at_estimate=model.input_price,
                output_price_at_estimate=model.output_price,
            ).id

        payload = EstimateResponseSerializer(
            {
                "model_id": model.id,
                "model_slug": model.slug,
                "model_name": model.name,
                "provider_slug": model.provider.slug,
                "input_tokens": result.input_tokens,
                "output_tokens": result.output_tokens,
                "total_tokens": result.total_tokens,
                "input_cost": result.input_cost,
                "output_cost": result.output_cost,
                "estimated_cost": result.estimated_cost,
                "strategy": result.strategy,
                "saved_id": saved_id,
            },
        )
        return Response(payload.data, status=status.HTTP_200_OK)


class EstimateHistoryView(generics.ListAPIView):
    """List the authenticated user's saved estimates."""

    serializer_class = EstimateHistorySerializer
    permission_classes = (permissions.IsAuthenticated,)
    ordering_fields = ("created_at", "total_tokens", "estimated_cost")
    ordering = ("-created_at",)

    def get_queryset(self):
        return (
            Estimate.objects.select_related("model", "model__provider")
            .filter(user=self.request.user)
        )


class EstimateDetailView(generics.RetrieveDestroyAPIView):
    """Retrieve or delete a single saved estimate."""

    serializer_class = EstimateHistorySerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return (
            Estimate.objects.select_related("model", "model__provider")
            .filter(user=self.request.user)
        )
