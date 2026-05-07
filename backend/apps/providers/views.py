"""ViewSets for the provider catalog."""
from __future__ import annotations

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminOrReadOnly

from .filters import AIModelFilter, ProviderFilter
from .models import AIModel, Provider
from .serializers import (
    AIModelSerializer,
    CapabilityChoiceSerializer,
    ProviderSerializer,
)


class ProviderViewSet(viewsets.ModelViewSet):
    queryset = Provider.objects.all()
    serializer_class = ProviderSerializer
    permission_classes = (IsAdminOrReadOnly,)
    filterset_class = ProviderFilter
    search_fields = ("name", "slug")
    ordering_fields = ("name", "created_at", "updated_at")
    ordering = ("name",)
    lookup_field = "slug"
    lookup_value_regex = r"[-a-zA-Z0-9_]+"

    @action(detail=True, methods=("get",), url_path="models")
    def models(self, request, slug=None):
        provider = self.get_object()
        qs = provider.models.all().order_by("name")
        active_only = request.query_params.get("active_only")
        if active_only and active_only.lower() in ("1", "true", "yes"):
            qs = qs.filter(is_active=True)
        page = self.paginate_queryset(qs)
        serializer = AIModelSerializer(page if page is not None else qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class AIModelViewSet(viewsets.ModelViewSet):
    queryset = AIModel.objects.select_related("provider").all()
    serializer_class = AIModelSerializer
    permission_classes = (IsAdminOrReadOnly,)
    filterset_class = AIModelFilter
    search_fields = ("name", "slug", "provider__name", "provider__slug")
    ordering_fields = (
        "name",
        "input_price",
        "output_price",
        "context_window",
        "created_at",
    )
    ordering = ("provider__name", "name")

    @action(
        detail=False,
        methods=("get",),
        url_path="capabilities",
        pagination_class=None,
        filterset_class=None,
    )
    def list_capabilities(self, _request):
        return Response(CapabilityChoiceSerializer.all())
