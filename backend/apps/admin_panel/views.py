"""Admin-only endpoints (user management, feedback, system stats)."""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.billing.models import Plan, Subscription
from apps.providers.models import AIModel, Provider
from apps.usage.models import UsageRecord

from .models import Feedback
from .serializers import (
    AdminAssignPlanSerializer,
    AdminFeedbackSerializer,
    AdminUserSerializer,
    FeedbackSerializer,
)

User = get_user_model()


class AdminUserViewSet(viewsets.ModelViewSet):
    """List, view, update users — admin-only."""

    serializer_class = AdminUserSerializer
    permission_classes = (IsAdmin,)
    queryset = User.objects.select_related("subscription", "subscription__plan").all()
    search_fields = ("email", "full_name")
    ordering_fields = ("date_joined", "email", "last_login")
    ordering = ("-date_joined",)
    http_method_names = ("get", "patch", "head", "options")


class AdminAssignPlanView(APIView):
    """Force-assign a plan to a user (admin override)."""

    permission_classes = (IsAdmin,)
    serializer_class = AdminAssignPlanSerializer

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = Plan.objects.get(code=serializer.validated_data["plan_code"], is_active=True)

        sub, _created = Subscription.objects.get_or_create(
            user=user,
            defaults={
                "plan": plan,
                "current_period_end": timezone.now() + timedelta(days=30),
            },
        )
        sub.plan = plan
        sub.status = Subscription.Status.ACTIVE
        sub.canceled_at = None
        sub.save(update_fields=["plan", "status", "canceled_at", "updated_at"])
        return Response(AdminUserSerializer(user).data)


class AdminSystemStatsView(APIView):
    """High-level KPIs for the admin dashboard."""

    permission_classes = (IsAdmin,)

    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        users_total = User.objects.count()
        users_active_30d = (
            UsageRecord.objects.filter(created_at__gte=thirty_days_ago)
            .values("user")
            .distinct()
            .count()
        )

        providers_total = Provider.objects.count()
        providers_active = Provider.objects.filter(is_active=True).count()
        models_total = AIModel.objects.count()
        models_active = AIModel.objects.filter(is_active=True).count()

        usage_30d = UsageRecord.objects.filter(created_at__gte=thirty_days_ago).aggregate(
            calls=Count("id"),
            tokens=Sum("total_tokens"),
            cost=Sum("cost_usd"),
        )

        plan_breakdown = (
            Subscription.objects.values("plan__code")
            .annotate(count=Count("id"))
            .order_by("plan__code")
        )

        daily_usage = (
            UsageRecord.objects.filter(created_at__gte=thirty_days_ago)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(calls=Count("id"), tokens=Sum("total_tokens"), cost=Sum("cost_usd"))
            .order_by("day")
        )

        return Response(
            {
                "users_total": users_total,
                "users_active_30d": users_active_30d,
                "providers_total": providers_total,
                "providers_active": providers_active,
                "models_total": models_total,
                "models_active": models_active,
                "usage_30d": {
                    "calls": int(usage_30d["calls"] or 0),
                    "tokens": int(usage_30d["tokens"] or 0),
                    "cost_usd": str(usage_30d["cost"] or Decimal("0")),
                },
                "plan_breakdown": [
                    {"plan_code": row["plan__code"], "count": row["count"]}
                    for row in plan_breakdown
                ],
                "daily_usage_30d": [
                    {
                        "day": row["day"].isoformat(),
                        "calls": int(row["calls"] or 0),
                        "tokens": int(row["tokens"] or 0),
                        "cost_usd": str(row["cost"] or Decimal("0")),
                    }
                    for row in daily_usage
                ],
            },
        )


class FeedbackCreateView(generics.CreateAPIView):
    """Authenticated users can submit feedback."""

    serializer_class = FeedbackSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AdminFeedbackViewSet(viewsets.ModelViewSet):
    """Admin view: triage and update feedback."""

    serializer_class = AdminFeedbackSerializer
    permission_classes = (IsAdmin,)
    queryset = Feedback.objects.select_related("user").all()
    search_fields = ("subject", "message", "user__email")
    ordering_fields = ("created_at", "status", "kind")
    ordering = ("-created_at",)
    http_method_names = ("get", "patch", "delete", "head", "options")
