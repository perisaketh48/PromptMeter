"""Shared pagination classes."""
from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """PageNumberPagination with a client-controllable page size."""

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
