"""django-filter FilterSets for providers and AI models."""
import django_filters
from django.db.models import CharField
from django.db.models.functions import Cast

from .models import AIModel, Provider


class ProviderFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Provider
        fields = ("is_active", "slug", "name")


class AIModelFilter(django_filters.FilterSet):
    provider_slug = django_filters.CharFilter(field_name="provider__slug")
    capability = django_filters.CharFilter(method="filter_capability")
    min_context = django_filters.NumberFilter(
        field_name="context_window", lookup_expr="gte",
    )
    max_input_price = django_filters.NumberFilter(
        field_name="input_price", lookup_expr="lte",
    )
    max_output_price = django_filters.NumberFilter(
        field_name="output_price", lookup_expr="lte",
    )

    class Meta:
        model = AIModel
        fields = ("is_active", "provider", "provider_slug", "slug")

    def filter_capability(self, queryset, _name, value):
        # Portable across PostgreSQL and SQLite: cast the JSONField to text
        # and look for the JSON-quoted scalar (capability codes are slugs,
        # so quoting eliminates substring false positives).
        return queryset.annotate(
            _caps_text=Cast("capabilities", output_field=CharField()),
        ).filter(_caps_text__icontains=f'"{value}"')
