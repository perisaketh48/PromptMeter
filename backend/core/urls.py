"""Root URL configuration.

Feature routes are added under ``api/v1/`` in subsequent steps as their
apps are wired up. For step 1 we expose only the admin, the OpenAPI
schema, and a health probe.
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.admin_panel.views import FeedbackCreateView


def health(_request):
    return JsonResponse({"status": "ok"})


api_v1_patterns = [
    path("health/", health, name="health"),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("auth/", include("apps.accounts.urls", namespace="accounts")),
    path("catalog/", include("apps.providers.urls", namespace="providers")),
    path("tokenizer/", include("apps.tokenizer.urls", namespace="tokenizer")),
    path("billing/", include("apps.billing.urls", namespace="billing")),
    path("usage/", include("apps.usage.urls", namespace="usage")),
    path("budgets/", include("apps.budgets.urls", namespace="budgets")),
    path("proxy/", include("apps.proxy.urls", namespace="proxy")),
    path("admin-panel/", include("apps.admin_panel.urls", namespace="admin_panel")),
    path("feedback/submit/", FeedbackCreateView.as_view(), name="feedback-submit"),
]


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include((api_v1_patterns, "api_v1"))),
]
