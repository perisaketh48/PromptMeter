"""Aggregation helpers for usage analytics."""
from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from .models import UsageRecord


def default_window(days: int = 30) -> tuple[datetime, datetime]:
    end = timezone.now()
    start = end - timedelta(days=days)
    return start, end


def summary_for_user(user, *, start: datetime | None = None, end: datetime | None = None) -> dict:
    if start is None or end is None:
        start, end = default_window()
    qs = UsageRecord.objects.filter(user=user, created_at__gte=start, created_at__lte=end)

    agg = qs.aggregate(
        total_calls=Count("id"),
        total_tokens=Sum("total_tokens"),
        total_cost=Sum("cost_usd"),
        prompt_tokens=Sum("prompt_tokens"),
        completion_tokens=Sum("completion_tokens"),
    )
    return {
        "start": start,
        "end": end,
        "total_calls": int(agg["total_calls"] or 0),
        "total_tokens": int(agg["total_tokens"] or 0),
        "prompt_tokens": int(agg["prompt_tokens"] or 0),
        "completion_tokens": int(agg["completion_tokens"] or 0),
        "total_cost_usd": agg["total_cost"] or Decimal("0"),
    }


def by_day(user, *, start: datetime | None = None, end: datetime | None = None) -> list[dict]:
    if start is None or end is None:
        start, end = default_window()
    rows = (
        UsageRecord.objects.filter(user=user, created_at__gte=start, created_at__lte=end)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(
            calls=Count("id"),
            tokens=Sum("total_tokens"),
            cost=Sum("cost_usd"),
        )
        .order_by("day")
    )
    return [
        {
            "day": r["day"],
            "calls": int(r["calls"] or 0),
            "tokens": int(r["tokens"] or 0),
            "cost_usd": r["cost"] or Decimal("0"),
        }
        for r in rows
    ]


def by_model(user, *, start: datetime | None = None, end: datetime | None = None) -> list[dict]:
    if start is None or end is None:
        start, end = default_window()
    rows = (
        UsageRecord.objects.filter(user=user, created_at__gte=start, created_at__lte=end)
        .values(
            "model_id",
            "model__slug",
            "model__name",
            "model__provider__slug",
            "model__provider__name",
        )
        .annotate(
            calls=Count("id"),
            tokens=Sum("total_tokens"),
            cost=Sum("cost_usd"),
        )
        .order_by("-cost")
    )
    return [
        {
            "model_id": r["model_id"],
            "model_slug": r["model__slug"],
            "model_name": r["model__name"],
            "provider_slug": r["model__provider__slug"],
            "provider_name": r["model__provider__name"],
            "calls": int(r["calls"] or 0),
            "tokens": int(r["tokens"] or 0),
            "cost_usd": r["cost"] or Decimal("0"),
        }
        for r in rows
    ]


def record_usage(
    *,
    user,
    model,
    prompt_tokens: int,
    completion_tokens: int,
    cost_usd: Decimal,
    source: str,
    latency_ms: int | None = None,
    status: str = UsageRecord.Status.SUCCESS,
    error_message: str = "",
) -> UsageRecord:
    """Persist a single usage row. Used by the proxy and the estimator."""
    return UsageRecord.objects.create(
        user=user,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens,
        cost_usd=cost_usd,
        latency_ms=latency_ms,
        status=status,
        source=source,
        error_message=error_message,
    )
