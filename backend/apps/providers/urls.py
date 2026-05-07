"""URL routes for the providers app."""
from rest_framework.routers import DefaultRouter

from .views import AIModelViewSet, ProviderViewSet

app_name = "providers"

router = DefaultRouter()
router.register(r"providers", ProviderViewSet, basename="provider")
router.register(r"models", AIModelViewSet, basename="aimodel")

urlpatterns = router.urls
