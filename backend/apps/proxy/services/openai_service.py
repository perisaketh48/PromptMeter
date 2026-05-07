"""OpenAI proxy service."""
from __future__ import annotations

import time

from .base import (
    DEFAULT_MAX_RETRIES,
    DEFAULT_TIMEOUT_SECONDS,
    ProxyError,
    ProxyResult,
    with_retry,
)


class OpenAIService:
    name = "openai"

    def chat(
        self,
        *,
        api_key: str,
        model_slug: str,
        messages: list[dict],
        max_tokens: int | None = None,
        temperature: float | None = None,
        timeout: int = DEFAULT_TIMEOUT_SECONDS,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> ProxyResult:
        # Imported lazily so the app boots without the optional SDK.
        try:
            from openai import (  # type: ignore[import-not-found]
                APIConnectionError,
                APITimeoutError,
                OpenAI,
                RateLimitError,
            )
        except ImportError as exc:
            raise ProxyError(
                "openai SDK not installed; add `openai` to requirements.txt.",
                status_code=500,
            ) from exc

        client = OpenAI(api_key=api_key, timeout=timeout)

        kwargs: dict = {"model": model_slug, "messages": messages}
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        if temperature is not None:
            kwargs["temperature"] = temperature

        def _call() -> ProxyResult:
            start = time.monotonic()
            try:
                response = client.chat.completions.create(**kwargs)
            except RateLimitError as exc:
                raise ProxyError(str(exc), status_code=429) from exc
            except (APIConnectionError, APITimeoutError) as exc:
                raise ProxyError(str(exc), status_code=504) from exc
            except Exception as exc:  # noqa: BLE001
                raise ProxyError(str(exc), status_code=502) from exc
            latency_ms = int((time.monotonic() - start) * 1000)

            choice = response.choices[0]
            usage = response.usage
            return ProxyResult(
                content=choice.message.content or "",
                role=choice.message.role,
                finish_reason=choice.finish_reason,
                prompt_tokens=int(usage.prompt_tokens),
                completion_tokens=int(usage.completion_tokens),
                total_tokens=int(usage.total_tokens),
                latency_ms=latency_ms,
                raw=response.model_dump() if hasattr(response, "model_dump") else {},
            )

        def _retryable(exc: Exception) -> bool:
            if isinstance(exc, ProxyError):
                return exc.status_code in (429, 502, 504)
            return False

        return with_retry(_call, max_retries=max_retries, is_retryable=_retryable)
