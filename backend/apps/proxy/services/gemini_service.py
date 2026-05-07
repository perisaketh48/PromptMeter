"""Google Gemini proxy service."""
from __future__ import annotations

import time

from .base import (
    DEFAULT_MAX_RETRIES,
    DEFAULT_TIMEOUT_SECONDS,
    ProxyError,
    ProxyResult,
    with_retry,
)


def _to_gemini_history(messages: list[dict]) -> tuple[str, list[dict], str]:
    """Split into (system_instruction, history, latest_user_text).

    Gemini expects history rows of {"role": "user" | "model", "parts": [...]}
    and a single most-recent user prompt passed to ``generate_content``.
    """
    system_parts: list[str] = []
    history: list[dict] = []
    latest_user: str = ""

    for msg in messages:
        role = msg.get("role")
        content = str(msg.get("content", ""))
        if role == "system":
            system_parts.append(content)
            continue
        gem_role = "user" if role == "user" else "model"
        history.append({"role": gem_role, "parts": [content]})

    if history and history[-1]["role"] == "user":
        latest_user = history.pop()["parts"][0]

    return "\n\n".join(s for s in system_parts if s), history, latest_user


class GeminiService:
    name = "google"

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
            import google.generativeai as genai  # type: ignore[import-not-found]
        except ImportError as exc:
            raise ProxyError(
                "google-generativeai SDK not installed; "
                "add `google-generativeai` to requirements.txt.",
                status_code=500,
            ) from exc

        genai.configure(api_key=api_key)
        system_instruction, history, latest_user = _to_gemini_history(messages)

        gen_config: dict = {}
        if max_tokens is not None:
            gen_config["max_output_tokens"] = max_tokens
        if temperature is not None:
            gen_config["temperature"] = temperature

        model_kwargs: dict = {"model_name": model_slug}
        if system_instruction:
            model_kwargs["system_instruction"] = system_instruction
        if gen_config:
            model_kwargs["generation_config"] = gen_config

        model = genai.GenerativeModel(**model_kwargs)

        def _call() -> ProxyResult:
            start = time.monotonic()
            try:
                if history:
                    chat = model.start_chat(history=history)
                    response = chat.send_message(
                        latest_user,
                        request_options={"timeout": timeout},
                    )
                else:
                    response = model.generate_content(
                        latest_user,
                        request_options={"timeout": timeout},
                    )
            except Exception as exc:  # noqa: BLE001
                raise ProxyError(str(exc), status_code=502) from exc
            latency_ms = int((time.monotonic() - start) * 1000)

            content = getattr(response, "text", "") or ""
            meta = getattr(response, "usage_metadata", None)
            prompt_tokens = int(getattr(meta, "prompt_token_count", 0)) if meta else 0
            completion_tokens = int(getattr(meta, "candidates_token_count", 0)) if meta else 0

            return ProxyResult(
                content=content,
                role="assistant",
                finish_reason=str(
                    getattr(response.candidates[0], "finish_reason", "") if response.candidates else "",
                ),
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
                latency_ms=latency_ms,
                raw={},
            )

        def _retryable(exc: Exception) -> bool:
            return isinstance(exc, ProxyError) and exc.status_code in (429, 502, 504)

        return with_retry(_call, max_retries=max_retries, is_retryable=_retryable)
