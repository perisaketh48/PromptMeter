"""URL routes for the billing app."""
from django.urls import path

from .views import (
    CancelSubscriptionView,
    ChangePlanView,
    InvoiceListView,
    MySubscriptionView,
    PlanListView,
    QuotaStatusView,
)

app_name = "billing"

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="plans"),
    path("subscription/", MySubscriptionView.as_view(), name="subscription"),
    path("subscription/change/", ChangePlanView.as_view(), name="change-plan"),
    path("subscription/cancel/", CancelSubscriptionView.as_view(), name="cancel"),
    path("invoices/", InvoiceListView.as_view(), name="invoices"),
    path("quota/", QuotaStatusView.as_view(), name="quota"),
]
