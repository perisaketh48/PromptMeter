"""User and Profile models for the accounts app."""
from __future__ import annotations

from typing import Any

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Manager for the email-as-username custom user model."""

    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra_fields: Any):
        if not email:
            raise ValueError(_("An email address is required."))
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra_fields: Any):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", User.Role.USER)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str | None = None, **extra_fields: Any):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", User.Role.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))

        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Email-authenticated user with a coarse-grained role flag."""

    class Role(models.TextChoices):
        USER = "user", _("User")
        ADMIN = "admin", _("Admin")

    email = models.EmailField(_("email address"), unique=True)
    full_name = models.CharField(_("full name"), max_length=150, blank=True)
    role = models.CharField(
        _("role"),
        max_length=16,
        choices=Role.choices,
        default=Role.USER,
    )
    is_active = models.BooleanField(_("active"), default=True)
    is_staff = models.BooleanField(_("staff"), default=False)
    date_joined = models.DateTimeField(_("date joined"), default=timezone.now)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")
        ordering = ("-date_joined",)
        indexes = (models.Index(fields=("role",)),)

    def __str__(self) -> str:
        return self.email

    def save(self, *args: Any, **kwargs: Any) -> None:
        if self.role == self.Role.ADMIN:
            self.is_staff = True
        super().save(*args, **kwargs)

    @property
    def is_admin(self) -> bool:
        return self.is_staff or self.role == self.Role.ADMIN


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    display_name = models.CharField(max_length=150, blank=True)
    organization = models.CharField(max_length=150, blank=True)
    timezone = models.CharField(max_length=64, default="UTC")
    avatar_url = models.URLField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("profile")
        verbose_name_plural = _("profiles")

    def __str__(self) -> str:
        return f"Profile<{self.user.email}>"
