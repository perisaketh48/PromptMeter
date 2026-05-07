"""Auto-attach a default subscription when a user is created."""
from __future__ import annotations

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .services import add_one_month, get_default_plan


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_subscription(sender, instance, created, **_kwargs):
    if not created:
        return
    # Avoid circular imports at module load.
    from .models import Subscription

    plan = get_default_plan()
    if plan is None:
        # Plans haven't been seeded yet (e.g. fresh-install bootstrap).
        # The user will get a subscription lazily via get_or_create_subscription
        # the first time they hit /billing/subscription/.
        return

    if Subscription.objects.filter(user=instance).exists():
        return

    now = timezone.now()
    Subscription.objects.create(
        user=instance,
        plan=plan,
        started_at=now,
        current_period_start=now,
        current_period_end=add_one_month(now),
    )
