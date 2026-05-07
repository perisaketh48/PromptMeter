"""Admin registration for feedback."""
from django.contrib import admin

from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "kind", "subject", "status")
    list_filter = ("kind", "status")
    search_fields = ("subject", "message", "user__email")
    autocomplete_fields = ("user",)
    readonly_fields = ("user", "kind", "subject", "message", "created_at", "updated_at")
