"""URL routes for budgets and notifications."""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BudgetViewSet,
    MarkAllNotificationsReadView,
    MarkNotificationReadView,
    NotificationDetailView,
    NotificationListView,
)

app_name = "budgets"

router = DefaultRouter()
router.register(r"budgets", BudgetViewSet, basename="budget")

urlpatterns = router.urls + [
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path(
        "notifications/<int:pk>/",
        NotificationDetailView.as_view(),
        name="notification-detail",
    ),
    path(
        "notifications/<int:pk>/read/",
        MarkNotificationReadView.as_view(),
        name="notification-read",
    ),
    path(
        "notifications/read-all/",
        MarkAllNotificationsReadView.as_view(),
        name="notifications-read-all",
    ),
]
