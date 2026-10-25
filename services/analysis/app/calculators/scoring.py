"""
Pure market-statistics and deal-score math (no database access).

Input per product is one aggregate per day of comparable listings (same
condition class and language, prices in EUR), produced by the SQL query in
market_stats_calculator.py. Working on daily aggregates instead of raw rows:

- every scrape stores every active listing again, so raw row counts mostly
  measure how often we scraped; one value per day removes that bias;
- medians of daily medians are robust against single absurd listings, so no
  separate outlier filter is needed for the reference prices;
- the database does the heavy lifting, so memory no longer depends on how
  many listings a popular card has (the old 1500-rows-per-product cap made
  "30 days" cover only the last few days for popular cards).

Deal model: a deal is the cheapest comparable listing on the most recent day,
compared with that product's *usual floor* (median of the daily cheapest
listing over the long window). Comparing a minimum against an average, as
before, put almost every product above 50 on price alone.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from statistics import median, pstdev
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class DayAggregate:
    day: date
    median_price: float
    p10_price: float
    min_price: float
    max_price: float
    listings: int
    last_seen_at: Optional[datetime] = None


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _pct_change(old: float, new: float) -> float:
    if old <= 0:
        return 0.0
    return (new - old) / old * 100.0


def data_quality(days_observed: int, cfg: Any) -> str:
    if days_observed >= cfg.MIN_DAYS_EXCELLENT:
        return "excellent"
    if days_observed >= cfg.MIN_DAYS_GOOD:
        return "good"
    if days_observed >= cfg.MIN_DAYS_FAIR:
        return "fair"
    if days_observed >= cfg.MIN_DAYS_POOR:
        return "poor"
    return "insufficient"


def liquidity_score(avg_daily_listings: float, cfg: Any) -> float:
    """0-100 from the average number of listing observations per observed day."""
    high, med, low = cfg.HIGH_LIQUIDITY_DAILY, cfg.MED_LIQUIDITY_DAILY, cfg.LOW_LIQUIDITY_DAILY
    v = avg_daily_listings
    if v >= high:
        return 100.0
    if v >= med:
        return 50.0 + (v - med) / (high - med) * 50.0
    if v >= low:
        return 20.0 + (v - low) / (med - low) * 30.0
    return v / low * 20.0 if low > 0 else 0.0


def product_stats(days: List[DayAggregate], today: date, cfg: Any) -> Optional[Dict[str, Any]]:
    """
    Market statistics for one product from its daily aggregates (any order).
    Returns None when there is too little data to say anything.
    """
    if not days:
        return None
    days = sorted(days, key=lambda d: d.day)
    observations = sum(d.listings for d in days)
    if observations < cfg.MIN_OBSERVATIONS:
        return None

    short_cutoff = today - timedelta(days=cfg.SHORT_WINDOW_DAYS)
    recent = [d for d in days if d.day > short_cutoff]
    latest = days[-1]

    typical_30d = median(d.median_price for d in days)
    typical_7d = median(d.median_price for d in recent) if recent else None
    floor_30d = median(d.min_price for d in days)

    # Cheapest listing on the latest day, unless it looks like a data error
    current = latest.min_price
    if current < cfg.SUSPICIOUS_LOW_RATIO * typical_30d:
        current = latest.p10_price

    # Trends: daily median of the first vs the latest day in each window
    price_trend_7d = _pct_change(recent[0].median_price, latest.median_price) if len(recent) > 1 else 0.0
    price_trend_30d = _pct_change(days[0].median_price, latest.median_price) if len(days) > 1 else 0.0

    # Supply trend: listings per observed day, short window vs long window
    avg_daily_30d = observations / len(days)
    avg_daily_7d = sum(d.listings for d in recent) / len(recent) if recent else 0.0
    volume_trend_7d = _pct_change(avg_daily_30d, avg_daily_7d) if recent else 0.0

    medians = [d.median_price for d in days]
    mean_median = sum(medians) / len(medians)
    volatility = pstdev(medians) / mean_median * 100.0 if len(medians) > 1 and mean_median > 0 else 0.0

    return {
        "avg_price_7d": typical_7d,
        "min_price_7d": min(d.min_price for d in recent) if recent else None,
        "max_price_7d": max(d.max_price for d in recent) if recent else None,
        "volume_7d": sum(d.listings for d in recent),
        "avg_price_30d": typical_30d,
        "min_price_30d": min(d.min_price for d in days),
        "max_price_30d": max(d.max_price for d in days),
        "volume_30d": observations,
        "price_trend_7d": _clamp(price_trend_7d, -999.99, 999.99),
        "price_trend_30d": _clamp(price_trend_30d, -999.99, 999.99),
        "volume_trend_7d": _clamp(volume_trend_7d, -999.99, 999.99),
        "volume_trend_30d": 0.0,  # would need more than one long window of history
        "liquidity_score": liquidity_score(avg_daily_30d, cfg),
        "volatility": _clamp(volatility, 0.0, 999.99),
        "current_price": current,
        "floor_price_30d": floor_30d,
        "days_observed": len(days),
        "last_seen_at": latest.last_seen_at,
        "sample_size": observations,
        "data_quality": data_quality(len(days), cfg),
        **market_signal(days, today, cfg),
    }


def market_signal(days: List[DayAggregate], today: date, cfg: Any) -> Dict[str, Any]:
    """
    Buy/wait signal from asking-price supply (roadmap #3).

    Compares the last SIGNAL_WINDOW_DAYS completed days with the days before
    them (today is left out: at the morning run only one of the two daily
    scrapes is in, which would look like a supply drop):

    - floor change:  median daily cheapest listing, recent vs. before (%)
    - supply change: average listing observations per day, recent vs. before (%)

    Codes: "buy" (floor rising while supply shrinks), "wait" (floor falling
    while supply grows), "rising", "falling", "stable"; None with too little
    history. These are trends in ASKING prices, not advice.
    """
    empty = {"market_signal": None, "floor_change_7d": None, "supply_change_7d": None}
    done = sorted((d for d in days if d.day < today), key=lambda d: d.day)
    if len(done) < cfg.SIGNAL_MIN_DAYS:
        return empty
    split = today - timedelta(days=cfg.SIGNAL_WINDOW_DAYS)
    recent = [d for d in done if d.day >= split]
    before = [d for d in done if d.day < split]
    if len(recent) < cfg.SIGNAL_MIN_PERIOD_DAYS or len(before) < cfg.SIGNAL_MIN_PERIOD_DAYS:
        return empty

    floor_before = median(d.min_price for d in before)
    floor_recent = median(d.min_price for d in recent)
    supply_before = sum(d.listings for d in before) / len(before)
    supply_recent = sum(d.listings for d in recent) / len(recent)
    floor_change = _pct_change(floor_before, floor_recent)
    supply_change = _pct_change(supply_before, supply_recent)

    price_pct, supply_pct = cfg.SIGNAL_PRICE_PCT, cfg.SIGNAL_SUPPLY_PCT
    if floor_change >= price_pct and supply_change <= -supply_pct:
        code = "buy"
    elif floor_change <= -price_pct and supply_change >= supply_pct:
        code = "wait"
    elif floor_change >= price_pct:
        code = "rising"
    elif floor_change <= -price_pct:
        code = "falling"
    else:
        code = "stable"
    return {
        "market_signal": code,
        "floor_change_7d": _clamp(floor_change, -999.99, 999.99),
        "supply_change_7d": _clamp(supply_change, -999.99, 999.99),
    }


def price_deviation_score(current: float, floor: float, cfg: Any) -> float:
    """
    50 = at the usual floor, 100 = PRICE_DEVIATION_FULL_SCORE_PCT % or more
    below it, 0 = that much above it.
    """
    if floor <= 0:
        return 0.0
    below_pct = (floor - current) / floor * 100.0
    return _clamp(50.0 + below_pct / cfg.PRICE_DEVIATION_FULL_SCORE_PCT * 50.0, 0.0, 100.0)


def volume_trend_score(volume_trend: float) -> float:
    """More supply than usual = more competition between sellers = better for buyers."""
    if volume_trend >= 0:
        return min(100.0, 50.0 + volume_trend / 100.0 * 50.0)
    return max(0.0, 50.0 + volume_trend / 50.0 * 50.0)


def popularity_score(product_set: Optional[str], cfg: Any) -> float:
    name = (product_set or "").lower()
    for key, score in cfg.POPULAR_SETS.items():
        if key.lower() in name:
            return score
    return cfg.DEFAULT_POPULARITY


def confidence(quality: str, days_observed: int) -> float:
    base = {"excellent": 100.0, "good": 80.0, "fair": 60.0, "poor": 40.0}.get(quality, 20.0)
    if days_observed >= 20:
        return base
    if days_observed >= 10:
        return base * 0.9
    return base * 0.75


def deal_score(
    *,
    product_set: Optional[str],
    current_price: Optional[float],
    floor_price_30d: Optional[float],
    volume_trend_7d: float,
    liquidity: float,
    days_observed: int,
    data_quality_label: str,
    last_seen_at: Optional[datetime],
    now: datetime,
    cfg: Any,
) -> Optional[Dict[str, float]]:
    """Weighted deal score, or None when the product cannot be scored now."""
    if not current_price or not floor_price_30d or current_price <= 0 or floor_price_30d <= 0:
        return None
    if days_observed < cfg.MIN_DAYS_FOR_DEAL:
        return None
    if last_seen_at is None or now - last_seen_at > timedelta(hours=cfg.CURRENT_MAX_AGE_HOURS):
        return None

    price = price_deviation_score(current_price, floor_price_30d, cfg)
    volume = volume_trend_score(volume_trend_7d)
    popularity = popularity_score(product_set, cfg)
    total = (
        price * cfg.WEIGHT_PRICE_DEVIATION
        + volume * cfg.WEIGHT_VOLUME_TREND
        + liquidity * cfg.WEIGHT_LIQUIDITY
        + popularity * cfg.WEIGHT_POPULARITY
    )
    return {
        "price_deviation_score": price,
        "volume_trend_score": volume,
        "liquidity_score": liquidity,
        "popularity_score": popularity,
        "deal_score": _clamp(total, 0.0, 100.0),
        "confidence": confidence(data_quality_label, days_observed),
    }
