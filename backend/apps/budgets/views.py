"""ViewSets and endpoints for budgets, alerts, and notifications."""
from __future__ import annotations

from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Budget, BudgetAlert, Notification
from .serializers import (
    BudgetAlertSerializer,
    BudgetSerializer,
    NotificationSerializer,
)


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=("get",))
    def alerts(self, request, pk=None):
        budget = self.get_object()
        qs = budget.alerts.all().order_by("-triggered_at")
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(BudgetAlertSerializer(page, many=True).data)
        return Response(BudgetAlertSerializer(qs, many=True).data)


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        unread = self.request.query_params.get("unread")
        if unread and unread.lower() in ("1", "true", "yes"):
            qs = qs.filter(read_at__isnull=True)
        return qs


class NotificationDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = NotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class MarkNotificationReadView(generics.GenericAPIView):
    serializer_class = NotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if notif.read_at is None:
            notif.read_at = timezone.now()
            notif.save(update_fields=["read_at"])
        return Response(NotificationSerializer(notif).data)


class MarkAllNotificationsReadView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        updated = (
            Notification.objects
            .filter(user=request.user, read_at__isnull=True)
            .update(read_at=timezone.now())
        )
        return Response({"marked_read": updated}, status=status.HTTP_200_OK)
