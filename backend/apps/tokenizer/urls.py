"""URL routes for the tokenizer app."""
from django.urls import path

from .views import EstimateDetailView, EstimateHistoryView, EstimateView

app_name = "tokenizer"

urlpatterns = [
    path("estimate/", EstimateView.as_view(), name="estimate"),
    path("history/", EstimateHistoryView.as_view(), name="history"),
    path("history/<int:pk>/", EstimateDetailView.as_view(), name="history-detail"),
]
