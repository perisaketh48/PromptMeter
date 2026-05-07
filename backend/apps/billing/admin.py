"""Admin registration for billing models."""
from django.contrib import admin

from .models import Invoice, Plan, Subscription


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "monthly_price",
        "monthly_token_quota",
        "monthly_cost_cap_usd",
        "max_keys",
        "is_active",
        "sort_order",
    )
    list_filter = ("is_active",)
    search_fields = ("code", "name")
    ordering = ("sort_order", "monthly_price")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "plan",
        "status",
        "current_period_start",
        "current_period_end",
        "canceled_at",
    )
    list_filter = ("status", "plan")
    search_fields = ("user__email", "plan__code", "plan__name")
    autocomplete_fields = ("user", "plan")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "subscription",
        "amount",
        "currency",
        "status",
        "period_start",
        "period_end",
        "issued_at",
        "paid_at",
    )
    list_filter = ("status", "currency")
    search_fields = ("subscription__user__email",)
    readonly_fields = ("issued_at",)
