"""Budget evaluation and notification dispatch."""
from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from .models import Budget, BudgetAlert, Notification

THRESHOLDS = (50, 80, 100)


def period_bounds(period: str, now: datetime | None = None) -> tuple[datetime, datetime]:
    now = now or timezone.now()
    if period == Budget.Period.DAILY:
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
    elif period == Budget.Period.WEEKLY:
        start = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0,
        )
        end = start + timedelta(days=7)
    else:  # monthly
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Advance one calendar month.
        if start.month == 12:
            end = start.replace(year=start.year + 1, month=1)
        else:
            end = start.replace(month=start.month + 1)
    return start, end


def current_spend(budget: Budget, now: datetime | None = None) -> Decimal:
    from apps.usage.models import UsageRecord  # local import to avoid cycle

    start, end = period_bounds(budget.period, now=now)
    qs = UsageRecord.objects.filter(
        user=budget.user, created_at__gte=start, created_at__lt=end,
    )
    if budget.scope_model_id:
        qs = qs.filter(model_id=budget.scope_model_id)
    return qs.aggregate(total=Sum("cost_usd"))["total"] or Decimal("0")


def percent_used(budget: Budget, now: datetime | None = None) -> Decimal:
    spend = current_spend(budget, now=now)
    if budget.cap_usd <= 0:
        return Decimal("0")
    return (spend / budget.cap_usd) * Decimal("100")


def evaluate(budget: Budget, *, now: datetime | None = None) -> list[BudgetAlert]:
    """Compute spend, fire alerts/notifications for any newly-crossed thresholds.

    Idempotent within a billing period: each (budget, threshold, period_start)
    is uniquely indexed so a second pass within the same period is a no-op.
    """
    if not budget.is_active or budget.cap_usd <= 0:
        return []

    start, end = period_bounds(budget.period, now=now)
    spend = current_spend(budget, now=now)
    pct = (spend / budget.cap_usd) * Decimal("100")

    triggered: list[BudgetAlert] = []
    for threshold in THRESHOLDS:
        if not getattr(budget, f"threshold_{threshold}"):
            continue
        if pct < threshold:
            continue

        alert, created = BudgetAlert.objects.get_or_create(
            budget=budget,
            threshold_pct=threshold,
            period_start=start,
            defaults={"period_end": end, "actual_cost_usd": spend},
        )
        if not created:
            continue

        Notification.objects.create(
            user=budget.user,
            kind=Notification.Kind.BUDGET_ALERT,
            title=f"Budget '{budget.name}' has reached {threshold}%",
            body=(
                f"You've spent ${spend:.2f} of your "
                f"${budget.cap_usd:.2f} {budget.get_period_display().lower()} "
                f"budget."
            ),
            metadata={
                "budget_id": budget.id,
                "threshold_pct": threshold,
                "spend_usd": str(spend),
                "cap_usd": str(budget.cap_usd),
                "period_start": start.isoformat(),
                "period_end": end.isoformat(),
            },
        )
        alert.notified = True
        alert.save(update_fields=["notified"])
        triggered.append(alert)

    return triggered


def evaluate_all_for_user(user) -> list[BudgetAlert]:
    """Evaluate every active budget for a user. Called after each usage record."""
    triggered: list[BudgetAlert] = []
    for budget in Budget.objects.filter(user=user, is_active=True):
        triggered.extend(evaluate(budget))
    return triggered
