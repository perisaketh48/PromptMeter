"""Usage and analytics endpoints."""
from __future__ import annotations

import csv
from datetime import timedelta

from django.http import StreamingHttpResponse
from django.utils.dateparse import parse_datetime
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import UsageRecordFilter
from .models import UsageRecord
from .serializers import (
    UsageByDaySerializer,
    UsageByModelSerializer,
    UsageRecordSerializer,
    UsageSummarySerializer,
)
from .services import by_day, by_model, default_window, summary_for_user


def _parse_window(request):
    start_param = request.query_params.get("start")
    end_param = request.query_params.get("end")
    if start_param and end_param:
        start = parse_datetime(start_param)
        end = parse_datetime(end_param)
        if start and end and start < end:
            return start, end
    days = request.query_params.get("days")
    if days and days.isdigit():
        end = default_window()[1]
        start = end - timedelta(days=int(days))
        return start, end
    return default_window()


class UsageListView(generics.ListAPIView):
    serializer_class = UsageRecordSerializer
    permission_classes = (permissions.IsAuthenticated,)
    filterset_class = UsageRecordFilter
    ordering_fields = ("created_at", "total_tokens", "cost_usd", "latency_ms")
    ordering = ("-created_at",)

    def get_queryset(self):
        return (
            UsageRecord.objects.select_related("model", "model__provider")
            .filter(user=self.request.user)
        )


class UsageSummaryView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        start, end = _parse_window(request)
        data = summary_for_user(request.user, start=start, end=end)
        return Response(UsageSummarySerializer(data).data)


class UsageByDayView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        start, end = _parse_window(request)
        rows = by_day(request.user, start=start, end=end)
        return Response(UsageByDaySerializer(rows, many=True).data)


class UsageByModelView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        start, end = _parse_window(request)
        rows = by_model(request.user, start=start, end=end)
        return Response(UsageByModelSerializer(rows, many=True).data)


class _CsvEcho:
    """File-like sink that csv.writer can call .write() on."""

    def write(self, value):
        return value


class UsageExportView(APIView):
    """Stream the user's usage records as CSV."""

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        start, end = _parse_window(request)
        qs = (
            UsageRecord.objects.select_related("model", "model__provider")
            .filter(user=request.user, created_at__gte=start, created_at__lte=end)
            .order_by("-created_at")
            .iterator(chunk_size=500)
        )

        writer = csv.writer(_CsvEcho())
        header = [
            "created_at",
            "provider",
            "model",
            "source",
            "status",
            "prompt_tokens",
            "completion_tokens",
            "total_tokens",
            "cost_usd",
            "latency_ms",
        ]

        def rows():
            yield writer.writerow(header)
            for record in qs:
                yield writer.writerow(
                    [
                        record.created_at.isoformat(),
                        record.model.provider.slug,
                        record.model.slug,
                        record.source,
                        record.status,
                        record.prompt_tokens,
                        record.completion_tokens,
                        record.total_tokens,
                        f"{record.cost_usd}",
                        record.latency_ms or "",
                    ],
                )

        response = StreamingHttpResponse(rows(), content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="usage-{start.date()}-to-{end.date()}.csv"'
        )
        return response
