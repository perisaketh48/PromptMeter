from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    label = "accounts"
    verbose_name = "Accounts"

    def ready(self) -> None:
        # Wire up post_save signal that auto-creates Profile rows.
        from . import signals  # noqa: F401
