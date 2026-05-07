"""Subscription lifecycle and quota helpers."""
from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import Plan, Subscription


def add_one_month(dt: datetime) -> datetime:
    """Add one calendar month, clamping the day to the new month's last day."""
    year = dt.year + (dt.month // 12)
    month = (dt.month % 12) + 1
    last_day = calendar.monthrange(year, month)[1]
    return dt.replace(year=year, month=month, day=min(dt.day, last_day))


def get_default_plan() -> Plan | None:
    return Plan.objects.filter(code="FREE", is_active=True).first()


def get_or_create_subscription(user) -> Subscription | None:
    """Return the user's subscription, lazy-creating a FREE one if missing."""
    existing = Subscription.objects.filter(user=user).first()
    if existing is not None:
        return existing

    plan = get_default_plan()
    if plan is None:
        return None
    now = timezone.now()
    return Subscription.objects.create(
        user=user,
        plan=plan,
        started_at=now,
        current_period_start=now,
        current_period_end=add_one_month(now),
    )


@transaction.atomic
def change_plan(user, new_plan_code: str) -> Subscription:
    """Switch a user's subscription to a different plan."""
    sub = Subscription.objects.select_for_update().get(user=user)
    new_plan = Plan.objects.get(code=new_plan_code, is_active=True)
    sub.plan = new_plan
    sub.status = Subscription.Status.ACTIVE
    sub.canceled_at = None
    sub.save(update_fields=["plan", "status", "canceled_at", "updated_at"])
    return sub


@transaction.atomic
def cancel_subscription(user) -> Subscription:
    sub = Subscription.objects.select_for_update().get(user=user)
    sub.status = Subscription.Status.CANCELED
    sub.canceled_at = timezone.now()
    sub.save(update_fields=["status", "canceled_at", "updated_at"])
    return sub


def renew_period_if_due(sub: Subscription) -> Subscription:
    """Advance the period if the current one has elapsed."""
    if sub.current_period_end <= timezone.now():
        sub.current_period_start = sub.current_period_end
        sub.current_period_end = add_one_month(sub.current_period_end)
        sub.save(update_fields=["current_period_start", "current_period_end", "updated_at"])
    return sub


@dataclass(frozen=True)
class QuotaStatus:
    used_tokens: int
    token_quota: int | None
    tokens_remaining: int | None
    used_cost_usd: Decimal
    cost_cap_usd: Decimal | None
    cost_remaining_usd: Decimal | None
    period_start: datetime
    period_end: datetime
    plan_code: str


def get_quota_status(user) -> QuotaStatus | None:
    """Return current-period token and cost utilisation for a user."""
    from apps.usage.models import UsageRecord  # avoid circular import

    sub = get_or_create_subscription(user)
    if sub is None:
        return None
    sub = renew_period_if_due(sub)

    agg = UsageRecord.objects.filter(
        user=user,
        created_at__gte=sub.current_period_start,
        created_at__lt=sub.current_period_end,
    ).aggregate(tokens=Sum("total_tokens"), cost=Sum("cost_usd"))

    used_tokens = int(agg["tokens"] or 0)
    used_cost = agg["cost"] or Decimal("0")
    quota = sub.plan.monthly_token_quota
    cap = sub.plan.monthly_cost_cap_usd

    tokens_remaining = None if quota is None else max(quota - used_tokens, 0)
    cost_remaining = (
        None if cap is None else max(cap - used_cost, Decimal("0"))
    )

    return QuotaStatus(
        used_tokens=used_tokens,
        token_quota=quota,
        tokens_remaining=tokens_remaining,
        used_cost_usd=used_cost,
        cost_cap_usd=cap,
        cost_remaining_usd=cost_remaining,
        period_start=sub.current_period_start,
        period_end=sub.current_period_end,
        plan_code=sub.plan.code,
    )


class QuotaExceeded(Exception):
    """Raised when a usage call would exceed the plan's quota or cost cap."""

    def __init__(self, reason: str, status: QuotaStatus | None = None):
        super().__init__(reason)
        self.reason = reason
        self.status = status


def assert_within_quota(user, *, projected_tokens: int = 0, projected_cost: Decimal = Decimal("0")) -> None:
    """Raise ``QuotaExceeded`` if running ``projected_*`` would breach the plan."""
    status = get_quota_status(user)
    if status is None:
        return

    if status.token_quota is not None:
        if status.used_tokens + projected_tokens > status.token_quota:
            raise QuotaExceeded("Plan token quota would be exceeded.", status)

    if status.cost_cap_usd is not None:
        if status.used_cost_usd + projected_cost > status.cost_cap_usd:
            raise QuotaExceeded("Plan cost cap would be exceeded.", status)
