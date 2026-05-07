"""Seed the default subscription plans (FREE, PRO, TEAM, ENTERPRISE)."""
from decimal import Decimal

from django.db import migrations


PLANS = (
    {
        "code": "FREE",
        "name": "Free",
        "description": "Get started for free with token estimation and basic usage tracking.",
        "monthly_price": Decimal("0.00"),
        "monthly_token_quota": 100_000,
        "monthly_cost_cap_usd": Decimal("0.00"),
        "max_keys": 1,
        "features": ["estimator", "usage_basic"],
        "sort_order": 0,
    },
    {
        "code": "PRO",
        "name": "Pro",
        "description": "Higher quotas, AI proxy, full analytics, budgets and alerts.",
        "monthly_price": Decimal("29.00"),
        "monthly_token_quota": 10_000_000,
        "monthly_cost_cap_usd": Decimal("50.00"),
        "max_keys": 5,
        "features": ["estimator", "proxy", "analytics", "budgets"],
        "sort_order": 1,
    },
    {
        "code": "TEAM",
        "name": "Team",
        "description": "Team-scale quotas, multiple keys, and admin tooling.",
        "monthly_price": Decimal("99.00"),
        "monthly_token_quota": 50_000_000,
        "monthly_cost_cap_usd": Decimal("250.00"),
        "max_keys": 25,
        "features": ["estimator", "proxy", "analytics", "budgets", "team"],
        "sort_order": 2,
    },
    {
        "code": "ENTERPRISE",
        "name": "Enterprise",
        "description": "Unlimited tokens, unlimited keys, dedicated support.",
        "monthly_price": Decimal("0.00"),
        "monthly_token_quota": None,
        "monthly_cost_cap_usd": None,
        "max_keys": None,
        "features": ["estimator", "proxy", "analytics", "budgets", "team", "sso", "support"],
        "sort_order": 3,
    },
)


def seed(apps, _schema_editor):
    Plan = apps.get_model("billing", "Plan")
    for spec in PLANS:
        Plan.objects.update_or_create(code=spec["code"], defaults=spec)


def unseed(apps, _schema_editor):
    Plan = apps.get_model("billing", "Plan")
    Plan.objects.filter(code__in=[p["code"] for p in PLANS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed, reverse_code=unseed),
    ]
