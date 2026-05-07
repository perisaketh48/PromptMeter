"""Pick the right service implementation for a provider slug."""
from __future__ import annotations

from .anthropic_service import AnthropicService
from .base import ProxyError, ProxyResult
from .gemini_service import GeminiService
from .openai_service import OpenAIService

_REGISTRY = {
    "openai": OpenAIService(),
    "azure-openai": OpenAIService(),
    "anthropic": AnthropicService(),
    "google": GeminiService(),
    "google-gemini": GeminiService(),
}


def dispatch(
    *,
    provider_slug: str,
    api_key: str,
    model_slug: str,
    messages: list[dict],
    max_tokens: int | None = None,
    temperature: float | None = None,
) -> ProxyResult:
    service = _REGISTRY.get(provider_slug)
    if service is None:
        raise ProxyError(
            f"No proxy implementation is registered for provider '{provider_slug}'.",
            status_code=400,
        )
    return service.chat(
        api_key=api_key,
        model_slug=model_slug,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
