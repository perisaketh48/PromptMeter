"""Django admin registration for providers and AI models."""
from django.contrib import admin

from .models import AIModel, Provider


@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "model_count", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("name", "slug", "logo_url", "is_active")}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Models")
    def model_count(self, obj):
        return obj.models.count()


@admin.register(AIModel)
class AIModelAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "provider",
        "input_price",
        "output_price",
        "context_window",
        "max_output_tokens",
        "is_active",
        "updated_at",
    )
    list_filter = ("is_active", "provider")
    search_fields = ("name", "slug", "provider__name", "provider__slug")
    autocomplete_fields = ("provider",)
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("provider", "name", "slug", "is_active")}),
        (
            "Pricing (USD per 1,000 tokens)",
            {"fields": ("input_price", "output_price")},
        ),
        ("Capacity", {"fields": ("context_window", "max_output_tokens")}),
        ("Capabilities", {"fields": ("capabilities",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )
