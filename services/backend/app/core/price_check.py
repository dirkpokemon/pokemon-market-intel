"""
Price check: judge an asking price against the EU market for one product.

Pure functions only (no DB), so the thresholds are unit-tested in
tests/test_price_check.py. Reference prices come from market_statistics,
which the analysis service fills from comparable CardTrader listings
(near-mint singles, configured languages, EUR):

- floor   = floor_price_30d: median of the daily cheapest listing (usual lowest asking price)
- typical = avg_price_30d:   median of the daily median listing (normal asking price)

These are ASKING prices, not sold prices; the frontend must word results
accordingly ("gebruikelijke laagste vraagprijs"), and never call a listing
fraud — only "unusually low, be careful".
"""

import re
from dataclasses import dataclass
from typing import List, Optional, Tuple

# Below this fraction of the usual floor an offer is far cheaper than anyone
# normally asks: the classic too-good-to-be-true pattern behind most
# marketplace/social-media fraud reports.
SUSPICIOUS_RATIO = 0.6
# Up to this fraction of the floor it is a sharp but plausible deal.
BELOW_FLOOR_RATIO = 0.95
# Up to this multiple of the typical price it is still normal; above it high,
# and above VERY_HIGH_RATIO clearly overpriced.
NORMAL_HIGH_RATIO = 1.15
VERY_HIGH_RATIO = 1.5
# Dealers typically offer 70-90% of what a card realistically sells for.
FAIR_OFFER_RANGE = (0.70, 0.90)
# Below this much history the verdict is shown with a low-data warning.
MIN_DAYS = 3
MIN_OBSERVATIONS = 5

VERDICTS = ("suspicious_low", "below_floor", "normal", "high", "very_high")


@dataclass(frozen=True)
class Verdict:
    code: str                    # one of VERDICTS
    pct_vs_floor: float          # (price - floor) / floor * 100
    pct_vs_typical: float        # (price - typical) / typical * 100
    fair_offer_low: float
    fair_offer_high: float
    low_data: bool


def judge_price(
    price: float,
    floor: float,
    typical: float,
    days_observed: int,
    observations: int,
) -> Verdict:
    """Classify an asking price. floor and typical must be > 0."""
    if price <= 0 or floor <= 0 or typical <= 0:
        raise ValueError("price, floor and typical must be positive")

    normal_high = max(typical, floor) * NORMAL_HIGH_RATIO
    if price < floor * SUSPICIOUS_RATIO:
        code = "suspicious_low"
    elif price < floor * BELOW_FLOOR_RATIO:
        code = "below_floor"
    elif price <= normal_high:
        code = "normal"
    elif price <= typical * VERY_HIGH_RATIO:
        code = "high"
    else:
        code = "very_high"

    # What a seller can realistically get is about the usual lowest asking
    # price: buyers compare against the cheapest listings.
    return Verdict(
        code=code,
        pct_vs_floor=(price - floor) / floor * 100,
        pct_vs_typical=(price - typical) / typical * 100,
        fair_offer_low=round(floor * FAIR_OFFER_RANGE[0], 2),
        fair_offer_high=round(floor * FAIR_OFFER_RANGE[1], 2),
        low_data=days_observed < MIN_DAYS or observations < MIN_OBSERVATIONS,
    )


# ── Parsing pasted text ────────────────────────────────────────────────────

# "€ 59", "59,95 €", "EUR 12.50", "€1.234,56"
_PRICE_RE = re.compile(
    r"(?:€|eur(?:o)?)\s*(\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)"
    r"|(\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|eur(?:o)?\b)",
    re.IGNORECASE,
)

# Words that describe the listing, not the product
_NOISE_WORDS = {
    "vinted", "marktplaats", "facebook", "fb", "instagram", "ebay", "cardmarket",
    "cardtrader", "2dehands", "te", "koop", "verkoop", "verkocht", "gezocht",
    "sealed", "nieuw", "new", "mint", "nm", "near", "pokemon", "pokémon",
    "kaart", "kaarten", "card", "cards", "tcg", "eur", "euro", "prijs", "vaste",
    "bieden", "incl", "verzending", "verzenden", "ophalen", "only", "for",
    "sale", "fs", "wts", "the", "de", "het", "een", "en", "van", "voor",
}


def _to_float(raw: str) -> Optional[float]:
    s = raw.replace(" ", "")
    if "," in s and "." in s:
        # whichever separator comes last is the decimal one
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".")
    elif re.fullmatch(r"\d{1,3}(?:\.\d{3})+", s):
        s = s.replace(".", "")  # 1.234 = thousands
    try:
        value = float(s)
    except ValueError:
        return None
    return value if value > 0 else None


def extract_price(text: str) -> Optional[float]:
    """First euro amount in free text, or None."""
    for match in _PRICE_RE.finditer(text or ""):
        value = _to_float(match.group(1) or match.group(2))
        if value is not None:
            return value
    return None


def search_terms(text: str, max_terms: int = 6) -> List[str]:
    """Meaningful words of a pasted listing, for a name/set search."""
    without_prices = _PRICE_RE.sub(" ", text or "")
    words = re.findall(r"[0-9A-Za-zÀ-ÿ'’\-]+", without_prices)
    terms: List[str] = []
    for word in words:
        w = word.strip("-'’").lower()
        if len(w) < 2 or w in _NOISE_WORDS or w in terms:
            continue
        terms.append(w)
    return terms[:max_terms]


def parse_listing(text: str) -> Tuple[List[str], Optional[float]]:
    return search_terms(text), extract_price(text)
