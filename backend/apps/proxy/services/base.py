"""Common types and helpers for proxy service classes."""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any, Callable

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SECONDS = 60
DEFAULT_MAX_RETRIES = 2
RETRY_BACKOFF_SECONDS = 0.5


@dataclass(frozen=True)
class ProxyResult:
    content: str
    role: str
    finish_reason: str | None
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int
    raw: dict[str, Any]


class ProxyError(Exception):
    """Vendor call failed and we want to surface a uniform error to the client."""

    def __init__(self, message: str, *, status_code: int = 502, raw: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.raw = raw or {}


def with_retry(
    fn: Callable[[], ProxyResult],
    *,
    max_retries: int = DEFAULT_MAX_RETRIES,
    backoff: float = RETRY_BACKOFF_SECONDS,
    is_retryable: Callable[[Exception], bool] = lambda _exc: False,
) -> ProxyResult:
    """Run ``fn`` with simple exponential backoff for retryable failures."""
    last_exc: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt >= max_retries or not is_retryable(exc):
                raise
            sleep_for = backoff * (2 ** attempt)
            logger.warning(
                "Retrying proxy call (attempt %s/%s) after %.2fs due to %s",
                attempt + 1,
                max_retries,
                sleep_for,
                type(exc).__name__,
            )
            time.sleep(sleep_for)
    # Unreachable: either we returned or re-raised.
    raise last_exc  # type: ignore[misc]
