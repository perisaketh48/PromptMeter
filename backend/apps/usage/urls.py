"""URL routes for usage analytics."""
from django.urls import path

from .views import (
    UsageByDayView,
    UsageByModelView,
    UsageExportView,
    UsageListView,
    UsageSummaryView,
)

app_name = "usage"

urlpatterns = [
    path("records/", UsageListView.as_view(), name="records"),
    path("summary/", UsageSummaryView.as_view(), name="summary"),
    path("by-day/", UsageByDayView.as_view(), name="by-day"),
    path("by-model/", UsageByModelView.as_view(), name="by-model"),
    path("export/", UsageExportView.as_view(), name="export"),
]
