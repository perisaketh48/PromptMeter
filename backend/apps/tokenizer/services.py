"""Token estimation engine.

Pluggable strategies keyed by provider slug:

  * OpenAI / Azure-OpenAI -> tiktoken (offline, byte-pair-exact for known models)
  * Anthropic / Google / Mistral / Cohere / Meta-Llama -> calibrated
    character-per-token heuristic (no API key required, deterministic)
  * Anything else -> generic 4 chars/token heuristic
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Protocol

from apps.providers.models import AIModel

logger = logging.getLogger(__name__)

CENTS = Decimal("0.00000001")
DEFAULT_EXPECTED_OUTPUT = 256


@dataclass(frozen=True)
class TokenEstimate:
    input_tokens: int
    output_tokens: int
    total_tokens: int
    input_cost: Decimal
    output_cost: Decimal
    estimated_cost: Decimal
    strategy: str


class TokenizerStrategy(Protocol):
    name: str

    def count(self, text: str, model_slug: str) -> int: ...


class TiktokenStrategy:
    """OpenAI's official BPE tokenizer."""

    name = "tiktoken"

    # Substring matches against the model slug — first match wins.
    ENCODING_FALLBACK = (
        ("gpt-4o", "o200k_base"),
        ("gpt-4-turbo", "cl100k_base"),
        ("gpt-4", "cl100k_base"),
        ("gpt-3.5", "cl100k_base"),
        ("text-embedding-3", "cl100k_base"),
        ("text-embedding-ada", "cl100k_base"),
        ("davinci", "p50k_base"),
        ("curie", "p50k_base"),
    )
    DEFAULT_ENCODING = "o200k_base"

    def count(self, text: str, model_slug: str) -> int:
        if not text:
            return 0
        import tiktoken  # imported lazily so the app boots without tiktoken installed

        try:
            enc = tiktoken.encoding_for_model(model_slug)
        except KeyError:
            enc = tiktoken.get_encoding(self._resolve_encoding(model_slug))
        return len(enc.encode(text))

    def _resolve_encoding(self, model_slug: str) -> str:
        slug = model_slug.lower()
        for fragment, encoding in self.ENCODING_FALLBACK:
            if fragment in slug:
                return encoding
        return self.DEFAULT_ENCODING


@dataclass
class HeuristicStrategy:
    """Character-count heuristic (calibrated per provider)."""

    chars_per_token: float = 4.0
    name: str = "heuristic"

    def count(self, text: str, _model_slug: str) -> int:
        if not text:
            return 0
        return max(1, int(round(len(text) / self.chars_per_token)))


_REGISTRY: dict[str, TokenizerStrategy] = {
    "openai": TiktokenStrategy(),
    "azure-openai": TiktokenStrategy(),
    "anthropic": HeuristicStrategy(chars_per_token=3.5, name="anthropic-heuristic"),
    "google": HeuristicStrategy(chars_per_token=4.0, name="google-heuristic"),
    "mistral": HeuristicStrategy(chars_per_token=3.8, name="mistral-heuristic"),
    "cohere": HeuristicStrategy(chars_per_token=3.8, name="cohere-heuristic"),
    "meta-llama": HeuristicStrategy(chars_per_token=3.8, name="llama-heuristic"),
}
_DEFAULT_STRATEGY: TokenizerStrategy = HeuristicStrategy(
    chars_per_token=4.0,
    name="generic-heuristic",
)


def get_strategy(provider_slug: str) -> TokenizerStrategy:
    """Return the registered strategy for a provider slug, or the default."""
    return _REGISTRY.get(provider_slug, _DEFAULT_STRATEGY)


def _safe_count(strategy: TokenizerStrategy, text: str, model_slug: str) -> tuple[int, str]:
    """Run a strategy and fall back to the generic heuristic on failure."""
    try:
        return strategy.count(text, model_slug), strategy.name
    except Exception:  # noqa: BLE001 — surface failure to fallback path
        logger.exception(
            "Tokenizer strategy %s failed for model=%s; falling back to heuristic",
            strategy.name,
            model_slug,
        )
        return _DEFAULT_STRATEGY.count(text, model_slug), f"{_DEFAULT_STRATEGY.name}-fallback"


def estimate(
    *,
    model: AIModel,
    input_text: str = "",
    system_prompt: str = "",
    expected_output_tokens: int | None = None,
) -> TokenEstimate:
    """Compute a token + cost estimate against a specific AI model.

    Cost = (tokens / 1000) * price_per_1k, in USD, with full precision
    preserved through the pipeline and quantized to 8 decimal places at
    the boundary.
    """
    strategy = get_strategy(model.provider.slug)

    if system_prompt:
        prompt_text = f"{system_prompt}\n\n{input_text or ''}"
    else:
        prompt_text = input_text or ""

    input_tokens, strategy_name = _safe_count(strategy, prompt_text, model.slug)

    if expected_output_tokens is None:
        output_tokens = min(DEFAULT_EXPECTED_OUTPUT, model.max_output_tokens)
    else:
        output_tokens = max(0, min(expected_output_tokens, model.max_output_tokens))

    thousand = Decimal(1000)
    input_cost = (Decimal(input_tokens) / thousand) * model.input_price
    output_cost = (Decimal(output_tokens) / thousand) * model.output_price

    return TokenEstimate(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=input_tokens + output_tokens,
        input_cost=input_cost.quantize(CENTS, rounding=ROUND_HALF_UP),
        output_cost=output_cost.quantize(CENTS, rounding=ROUND_HALF_UP),
        estimated_cost=(input_cost + output_cost).quantize(CENTS, rounding=ROUND_HALF_UP),
        strategy=strategy_name,
    )
