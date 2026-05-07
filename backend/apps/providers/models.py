"""Provider and AIModel — the catalog and pricing layer."""
from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _


class Capability(models.TextChoices):
    TEXT = "text", _("Text Generation")
    CHAT = "chat", _("Chat Completion")
    VISION = "vision", _("Vision")
    FUNCTION_CALLING = "function_calling", _("Function Calling")
    EMBEDDING = "embedding", _("Embedding")
    AUDIO = "audio", _("Audio")
    CODE = "code", _("Code Generation")
    REASONING = "reasoning", _("Reasoning")
    STREAMING = "streaming", _("Streaming")
    JSON_MODE = "json_mode", _("JSON Mode")


def validate_capabilities(value) -> None:
    """Ensure JSONField stores only known capability codes."""
    if not isinstance(value, list):
        raise ValidationError(_("capabilities must be a list of strings."))
    valid = {choice[0] for choice in Capability.choices}
    invalid = sorted({v for v in value if v not in valid})
    if invalid:
        raise ValidationError(
            _("Unknown capabilities: %(invalid)s") % {"invalid": ", ".join(invalid)},
        )


class Provider(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(
        max_length=100,
        unique=True,
        help_text=_("URL-safe identifier (e.g. 'openai', 'anthropic', 'google')."),
    )
    logo_url = models.URLField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        indexes = (
            models.Index(fields=("slug",)),
            models.Index(fields=("is_active",)),
        )

    def __str__(self) -> str:
        return self.name


class AIModel(models.Model):
    """A specific model offered by a provider, with pricing and limits."""

    Capability = Capability  # noqa: N815 — public alias for callers

    provider = models.ForeignKey(
        Provider,
        on_delete=models.CASCADE,
        related_name="models",
    )
    name = models.CharField(max_length=150)
    slug = models.SlugField(
        max_length=150,
        help_text=_("URL-safe identifier, unique per provider."),
    )
    input_price = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        help_text=_("USD per 1,000 input tokens."),
    )
    output_price = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        help_text=_("USD per 1,000 output tokens."),
    )
    context_window = models.PositiveIntegerField(
        help_text=_("Maximum total tokens (input + output)."),
    )
    max_output_tokens = models.PositiveIntegerField(
        help_text=_("Maximum tokens the model can generate in one response."),
    )
    capabilities = models.JSONField(
        default=list,
        blank=True,
        validators=(validate_capabilities,),
        help_text=_("List of capability codes (see Capability choices)."),
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("provider__name", "name")
        constraints = (
            models.UniqueConstraint(
                fields=("provider", "slug"),
                name="uq_aimodel_provider_slug",
            ),
            models.CheckConstraint(
                check=models.Q(input_price__gte=0),
                name="ck_aimodel_input_price_nonneg",
            ),
            models.CheckConstraint(
                check=models.Q(output_price__gte=0),
                name="ck_aimodel_output_price_nonneg",
            ),
            models.CheckConstraint(
                check=models.Q(max_output_tokens__lte=models.F("context_window")),
                name="ck_aimodel_max_out_le_ctx",
            ),
        )
        indexes = (
            models.Index(fields=("provider", "is_active")),
            models.Index(fields=("slug",)),
        )

    def __str__(self) -> str:
        return f"{self.provider.name} / {self.name}"
