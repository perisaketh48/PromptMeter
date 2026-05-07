"""Anthropic proxy service."""
from __future__ import annotations

import time

from .base import (
    DEFAULT_MAX_RETRIES,
    DEFAULT_TIMEOUT_SECONDS,
    ProxyError,
    ProxyResult,
    with_retry,
)


def _split_system_messages(messages: list[dict]) -> tuple[str, list[dict]]:
    """Anthropic takes ``system`` separately from the message list."""
    system_parts: list[str] = []
    out: list[dict] = []
    for msg in messages:
        if msg.get("role") == "system":
            system_parts.append(str(msg.get("content", "")))
        else:
            out.append(msg)
    return "\n\n".join(s for s in system_parts if s), out


class AnthropicService:
    name = "anthropic"

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
        try:
            from anthropic import (  # type: ignore[import-not-found]
                APIConnectionError,
                APITimeoutError,
                Anthropic,
                RateLimitError,
            )
        except ImportError as exc:
            raise ProxyError(
                "anthropic SDK not installed; add `anthropic` to requirements.txt.",
                status_code=500,
            ) from exc

        client = Anthropic(api_key=api_key, timeout=timeout)
        system, body = _split_system_messages(messages)

        kwargs: dict = {
            "model": model_slug,
            "messages": body,
            "max_tokens": max_tokens or 1024,
        }
        if system:
            kwargs["system"] = system
        if temperature is not None:
            kwargs["temperature"] = temperature

        def _call() -> ProxyResult:
            start = time.monotonic()
            try:
                response = client.messages.create(**kwargs)
            except RateLimitError as exc:
                raise ProxyError(str(exc), status_code=429) from exc
            except (APIConnectionError, APITimeoutError) as exc:
                raise ProxyError(str(exc), status_code=504) from exc
            except Exception as exc:  # noqa: BLE001
                raise ProxyError(str(exc), status_code=502) from exc
            latency_ms = int((time.monotonic() - start) * 1000)

            text_parts = []
            for block in response.content:
                # Each block is a TextBlock or similar; .text exists for text blocks.
                text = getattr(block, "text", None)
                if text:
                    text_parts.append(text)
            content = "".join(text_parts)

            usage = response.usage
            prompt_tokens = int(getattr(usage, "input_tokens", 0))
            completion_tokens = int(getattr(usage, "output_tokens", 0))

            return ProxyResult(
                content=content,
                role="assistant",
                finish_reason=getattr(response, "stop_reason", None),
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
                latency_ms=latency_ms,
                raw=response.model_dump() if hasattr(response, "model_dump") else {},
            )

        def _retryable(exc: Exception) -> bool:
            if isinstance(exc, ProxyError):
                return exc.status_code in (429, 502, 504)
            return False

        return with_retry(_call, max_retries=max_retries, is_retryable=_retryable)
