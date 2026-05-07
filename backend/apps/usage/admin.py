"""Admin registration for usage records."""
from django.contrib import admin

from .models import UsageRecord


@admin.register(UsageRecord)
class UsageRecordAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "user",
        "model",
        "source",
        "status",
        "prompt_tokens",
        "completion_tokens",
        "total_tokens",
        "cost_usd",
        "latency_ms",
    )
    list_filter = ("source", "status", "model__provider", "created_at")
    search_fields = ("user__email", "model__name", "model__slug")
    autocomplete_fields = ("user", "model")
    readonly_fields = (
        "user",
        "model",
        "prompt_tokens",
        "completion_tokens",
        "total_tokens",
        "cost_usd",
        "latency_ms",
        "status",
        "source",
        "error_message",
        "created_at",
    )

    def has_add_permission(self, _request):
        return False
