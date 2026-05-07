"""Reusable DRF permission classes."""
from rest_framework import permissions


def _is_admin(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (user.is_staff or getattr(user, "role", None) == "admin")
    )


class IsAdmin(permissions.BasePermission):
    """Allow access only to staff users (or users with role=admin)."""

    def has_permission(self, request, view):
        return _is_admin(request.user)


class IsAdminOrReadOnly(permissions.BasePermission):
    """Authenticated users may read; only admins may write."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return _is_admin(user)


class IsOwnerOrAdmin(permissions.BasePermission):
    """Owners may access their own objects; admins may access any."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if _is_admin(user):
            return True
        owner_field = getattr(view, "owner_field", "user")
        owner = getattr(obj, owner_field, None)
        return owner == user
