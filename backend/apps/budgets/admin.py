"""Admin registration for budgets, alerts, notifications."""
from django.contrib import admin

from .models import Budget, BudgetAlert, Notification


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "name",
        "period",
        "cap_usd",
        "scope_model",
        "is_active",
        "created_at",
    )
    list_filter = ("period", "is_active")
    search_fields = ("user__email", "name")
    autocomplete_fields = ("user", "scope_model")
    readonly_fields = ("created_at", "updated_at")


@admin.register(BudgetAlert)
class BudgetAlertAdmin(admin.ModelAdmin):
    list_display = (
        "budget",
        "threshold_pct",
        "period_start",
        "actual_cost_usd",
        "notified",
        "triggered_at",
    )
    list_filter = ("threshold_pct", "notified")
    search_fields = ("budget__name", "budget__user__email")
    readonly_fields = (
        "budget",
        "threshold_pct",
        "period_start",
        "period_end",
        "actual_cost_usd",
        "triggered_at",
        "notified",
    )

    def has_add_permission(self, _request):
        return False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "kind", "title", "read_at", "created_at")
    list_filter = ("kind",)
    search_fields = ("user__email", "title")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at",)
