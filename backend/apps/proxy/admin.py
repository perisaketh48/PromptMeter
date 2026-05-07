"""Admin registration for vendor credentials."""
from django.contrib import admin

from .models import ProviderCredential


@admin.register(ProviderCredential)
class ProviderCredentialAdmin(admin.ModelAdmin):
    list_display = ("user", "provider", "label", "last4", "is_active", "updated_at")
    list_filter = ("provider", "is_active")
    search_fields = ("user__email", "provider__name", "label")
    autocomplete_fields = ("user", "provider")
    readonly_fields = ("encrypted_key", "last4", "created_at", "updated_at")

    def get_readonly_fields(self, request, obj=None):
        # Never show the decrypted key in the admin.
        return self.readonly_fields
