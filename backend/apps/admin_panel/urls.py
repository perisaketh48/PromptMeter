"""URL routes for admin endpoints + user feedback submission."""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminAssignPlanView,
    AdminFeedbackViewSet,
    AdminSystemStatsView,
    AdminUserViewSet,
    FeedbackCreateView,
)

app_name = "admin_panel"

router = DefaultRouter()
router.register(r"users", AdminUserViewSet, basename="admin-user")
router.register(r"feedback", AdminFeedbackViewSet, basename="admin-feedback")

urlpatterns = router.urls + [
    path("stats/", AdminSystemStatsView.as_view(), name="stats"),
    path("users/<int:pk>/assign-plan/", AdminAssignPlanView.as_view(), name="assign-plan"),
]


# Public-ish (authenticated user) feedback submission endpoint, mounted under
# a different prefix in core/urls.py.
public_urlpatterns = [
    path("submit/", FeedbackCreateView.as_view(), name="feedback-submit"),
]
