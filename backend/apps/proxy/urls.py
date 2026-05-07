"""URL routes for the proxy app."""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ChatProxyView, ProviderCredentialViewSet

app_name = "proxy"

router = DefaultRouter()
router.register(r"credentials", ProviderCredentialViewSet, basename="credential")

urlpatterns = router.urls + [
    path("chat/", ChatProxyView.as_view(), name="chat"),
]
