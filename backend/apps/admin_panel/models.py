"""Cross-cutting admin-panel models (user feedback)."""
from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Feedback(models.Model):
    class Kind(models.TextChoices):
        BUG = "bug", _("Bug")
        FEATURE = "feature", _("Feature request")
        QUESTION = "question", _("Question")
        OTHER = "other", _("Other")

    class Status(models.TextChoices):
        OPEN = "open", _("Open")
        IN_REVIEW = "in_review", _("In review")
        CLOSED = "closed", _("Closed")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedback",
    )
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.OTHER)
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = (models.Index(fields=("status", "-created_at")),)

    def __str__(self) -> str:
        return f"Feedback<{self.kind}:{self.subject}>"
