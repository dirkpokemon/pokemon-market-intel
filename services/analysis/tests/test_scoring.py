"""
Unit tests for the pure scoring math (no database needed).

Run from services/analysis:  DATABASE_URL=postgresql://x/y python -m pytest tests
"""
from datetime import date, datetime, timedelta, timezone

from app.calculators.scoring import (
    DayAggregate,
    deal_score,
    popularity_score,
    price_deviation_score,
    product_stats,
)
from app.config_analysis import AnalysisConfig

cfg = AnalysisConfig()
TODAY = date(2026, 10, 25)
NOW = datetime(2026, 10, 25, 12, tzinfo=timezone.utc)


def _days(n, median=10.0, low=8.0, listings=40):
    return [
        DayAggregate(
            day=TODAY - timedelta(days=n - 1 - i),
            median_price=median,
            p10_price=low + 0.5,
            min_price=low,
            max_price=median * 2,
            listings=listings,
            last_seen_at=NOW - timedelta(hours=2),
        )
        for i in range(n)
    ]


def test_steady_market_scores_neutral_on_price():
    stats = product_stats(_days(20), TODAY, cfg)
    assert stats["current_price"] == 8.0
    assert stats["floor_price_30d"] == 8.0
    assert stats["avg_price_30d"] == 10.0
    assert stats["days_observed"] == 20
    assert stats["data_quality"] == "excellent"
    # Cheapest listing equal to the usual floor is not a deal
    assert price_deviation_score(stats["current_price"], stats["floor_price_30d"], cfg) == 50.0


def test_drop_below_usual_floor_scores_high():
    days = _days(20)
    days[-1] = DayAggregate(TODAY, 10.0, 6.0, 5.6, 20.0, 40, NOW)
    stats = product_stats(days, TODAY, cfg)
    assert stats["current_price"] == 5.6  # 30% below floor of 8
    assert price_deviation_score(5.6, 8.0, cfg) == 100.0
    result = deal_score(
        product_set="Scarlet & Violet—151",
        current_price=stats["current_price"],
        floor_price_30d=stats["floor_price_30d"],
        volume_trend_7d=stats["volume_trend_7d"],
        liquidity=stats["liquidity_score"],
        days_observed=stats["days_observed"],
        data_quality_label=stats["data_quality"],
        last_seen_at=stats["last_seen_at"],
        now=NOW,
        cfg=cfg,
    )
    assert result["price_deviation_score"] == 100.0
    assert result["popularity_score"] == 95.0
    assert result["deal_score"] > 70


def test_suspiciously_low_listing_falls_back_to_p10():
    days = _days(10)
    days[-1] = DayAggregate(TODAY, 10.0, 7.5, 0.5, 20.0, 40, NOW)  # €0.50 vs typical €10
    stats = product_stats(days, TODAY, cfg)
    assert stats["current_price"] == 7.5


def test_stale_or_young_products_are_not_scored():
    stats = product_stats(_days(2), TODAY, cfg)
    common = dict(
        product_set=None, current_price=8.0, floor_price_30d=8.0, volume_trend_7d=0.0,
        liquidity=50.0, data_quality_label="poor", now=NOW, cfg=cfg,
    )
    assert deal_score(days_observed=stats["days_observed"], last_seen_at=NOW, **common) is None
    assert deal_score(days_observed=10, last_seen_at=NOW - timedelta(days=3), **common) is None
    assert deal_score(days_observed=10, last_seen_at=NOW, **common) is not None


def test_too_few_observations_returns_none():
    assert product_stats(_days(1, listings=2), TODAY, cfg) is None


def test_popularity_substring_match():
    assert popularity_score("Scarlet & Violet—Prismatic Evolutions", cfg) == 100.0
    assert popularity_score("Some Unknown Set", cfg) == cfg.DEFAULT_POPULARITY
    assert popularity_score(None, cfg) == cfg.DEFAULT_POPULARITY


def test_trend_uses_daily_medians():
    days = _days(10)
    days[-1] = DayAggregate(TODAY, 12.0, 8.5, 8.0, 20.0, 40, NOW)
    stats = product_stats(days, TODAY, cfg)
    assert round(stats["price_trend_7d"], 2) == 20.0
