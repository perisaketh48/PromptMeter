"""Filters for usage list endpoint."""
import django_filters

from .models import UsageRecord


class UsageRecordFilter(django_filters.FilterSet):
    start = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="gte")
    end = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="lte")
    provider_slug = django_filters.CharFilter(field_name="model__provider__slug")
    model_slug = django_filters.CharFilter(field_name="model__slug")

    class Meta:
        model = UsageRecord
        fields = ("source", "status", "model", "provider_slug", "model_slug", "start", "end")
