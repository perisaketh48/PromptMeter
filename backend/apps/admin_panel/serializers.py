"""Serializers for admin-only endpoints."""
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.billing.models import Plan, Subscription

from .models import Feedback

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    plan_code = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "date_joined",
            "last_login",
            "plan_code",
            "subscription_status",
        )
        read_only_fields = (
            "id",
            "email",
            "date_joined",
            "last_login",
            "plan_code",
            "subscription_status",
        )

    def get_plan_code(self, user):
        sub = getattr(user, "subscription", None)
        return sub.plan.code if sub else None

    def get_subscription_status(self, user):
        sub = getattr(user, "subscription", None)
        return sub.status if sub else None


class AdminAssignPlanSerializer(serializers.Serializer):
    plan_code = serializers.CharField()

    def validate_plan_code(self, value):
        if not Plan.objects.filter(code=value, is_active=True).exists():
            raise serializers.ValidationError("Plan not found or inactive.")
        return value


class FeedbackSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True, default=None)

    class Meta:
        model = Feedback
        fields = (
            "id",
            "user",
            "user_email",
            "kind",
            "subject",
            "message",
            "status",
            "admin_notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user", "user_email", "status", "admin_notes", "created_at", "updated_at")


class AdminFeedbackSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True, default=None)

    class Meta:
        model = Feedback
        fields = (
            "id",
            "user",
            "user_email",
            "kind",
            "subject",
            "message",
            "status",
            "admin_notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user", "user_email", "kind", "subject", "message", "created_at", "updated_at")
