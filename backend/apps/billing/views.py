"""Billing endpoints."""
from __future__ import annotations

from dataclasses import asdict

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Invoice, Plan
from .serializers import (
    ChangePlanSerializer,
    InvoiceSerializer,
    PlanSerializer,
    QuotaStatusSerializer,
    SubscriptionSerializer,
)
from .services import (
    cancel_subscription,
    change_plan,
    get_or_create_subscription,
    get_quota_status,
)


class PlanListView(generics.ListAPIView):
    """List all active subscription plans (publicly viewable)."""

    serializer_class = PlanSerializer
    permission_classes = (permissions.AllowAny,)
    pagination_class = None
    queryset = Plan.objects.filter(is_active=True).order_by("sort_order", "monthly_price")


class MySubscriptionView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        sub = get_or_create_subscription(request.user)
        if sub is None:
            return Response(
                {"detail": "No subscription plans configured."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(SubscriptionSerializer(sub).data)


class ChangePlanView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ChangePlanSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        sub = change_plan(request.user, serializer.validated_data["plan_code"])
        return Response(SubscriptionSerializer(sub).data, status=status.HTTP_200_OK)


class CancelSubscriptionView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        sub = cancel_subscription(request.user)
        return Response(SubscriptionSerializer(sub).data, status=status.HTTP_200_OK)


class InvoiceListView(generics.ListAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Invoice.objects.filter(subscription__user=self.request.user).order_by("-issued_at")


class QuotaStatusView(APIView):
    """Current-period token + cost utilisation against the user's plan."""

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        status_obj = get_quota_status(request.user)
        if status_obj is None:
            return Response(
                {"detail": "No subscription plans configured."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(QuotaStatusSerializer(asdict(status_obj)).data)
