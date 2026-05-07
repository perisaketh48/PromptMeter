"""Admin registration — Estimates are read-only history rows."""
from django.contrib import admin

from .models import Estimate


@admin.register(Estimate)
class EstimateAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "user",
        "model",
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "estimated_cost",
        "strategy",
    )
    list_filter = ("model__provider", "strategy", "created_at")
    search_fields = ("user__email", "model__name", "model__slug")
    autocomplete_fields = ("user", "model")
    readonly_fields = (
        "user",
        "model",
        "input_text",
        "system_prompt",
        "expected_output_tokens",
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "input_cost",
        "output_cost",
        "estimated_cost",
        "input_price_at_estimate",
        "output_price_at_estimate",
        "strategy",
        "created_at",
    )

    def has_add_permission(self, _request):
        return False
