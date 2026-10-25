"""
Market Statistics Calculator
Calculates market metrics per product from raw price data.

Postgres aggregates raw_prices into one row per (product, set, category, day)
over comparable listings only (see INCLUDED_CONDITIONS / INCLUDED_LANGUAGES);
the per-product math lives in scoring.product_stats.
"""

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import delete, insert, text

from app.calculators.scoring import DayAggregate, product_stats
from app.config_analysis import analysis_config
from app.database import AsyncSessionLocal
from app.models.market_stats import MarketStats

logger = logging.getLogger(__name__)

# Product identity: whitespace-collapsed name and set, compared case-insensitively
# (CardTrader and CardMarket spell the same card with different casing).
# Display values keep the scraped spelling — no title-casing or punctuation
# stripping, so names still match raw_prices / watchlist lookups.
DAILY_AGGREGATES_SQL = """
WITH base AS (
    SELECT
        regexp_replace(btrim(card_name), '\\s+', ' ', 'g') AS name_clean,
        COALESCE(NULLIF(regexp_replace(btrim(card_set), '\\s+', ' ', 'g'), ''), 'Unknown Set') AS set_clean,
        CASE WHEN card_number IS NULL THEN 'sealed' ELSE 'single' END AS category,
        price * {rate_case} AS price_eur,
        (scraped_at AT TIME ZONE 'UTC')::date AS day,
        scraped_at
    FROM raw_prices
    WHERE scraped_at >= :since
      AND price > 0
      AND card_name IS NOT NULL
      AND upper(COALESCE(language, 'EN')) = ANY(:languages)
      AND (
          card_number IS NULL
          OR condition IS NULL
          OR lower(btrim(condition)) = ANY(:conditions)
      )
)
SELECT
    lower(name_clean) AS name_key,
    lower(set_clean)  AS set_key,
    category,
    day,
    max(name_clean)   AS product_name,
    max(set_clean)    AS product_set,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY price_eur) AS median_price,
    percentile_cont(0.1) WITHIN GROUP (ORDER BY price_eur) AS p10_price,
    min(price_eur)    AS min_price,
    max(price_eur)    AS max_price,
    count(*)          AS listings,
    max(scraped_at)   AS last_seen_at
FROM base
WHERE price_eur IS NOT NULL
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 3, 4
"""


def _rate_case(rates: Dict[str, float]) -> Tuple[str, Dict[str, Any]]:
    """SQL CASE converting currency → EUR factor; unknown currencies become NULL (skipped)."""
    parts, params = [], {}
    for i, (code, rate) in enumerate(rates.items()):
        parts.append(f"WHEN :cur{i} THEN CAST(:rate{i} AS numeric)")
        params[f"cur{i}"] = code.upper()
        params[f"rate{i}"] = rate
    return "(CASE upper(COALESCE(currency, 'EUR')) " + " ".join(parts) + " ELSE NULL END)", params


def _dec(value: Optional[float]) -> Optional[Decimal]:
    if value is None:
        return None
    return Decimal(str(round(max(-99999999.99, min(99999999.99, value)), 2)))


class MarketStatsCalculator:
    """
    Calculates comprehensive market statistics per product
    """

    def __init__(self):
        self.config = analysis_config

    async def calculate_all(self) -> int:
        """
        Recalculate market_statistics for all products and replace the table
        contents in a single transaction, so API readers never see an empty or
        half-filled snapshot.

        Returns:
            Number of products saved
        """
        cfg = self.config
        now = datetime.now(timezone.utc)
        since = now - timedelta(days=cfg.LONG_WINDOW_DAYS)
        rate_case, rate_params = _rate_case(cfg.CURRENCY_RATES)
        stmt = text(DAILY_AGGREGATES_SQL.format(rate_case=rate_case))
        params = {
            "since": since,
            "languages": [lang.upper() for lang in cfg.INCLUDED_LANGUAGES],
            "conditions": [c.lower() for c in cfg.INCLUDED_CONDITIONS],
            **rate_params,
        }

        logger.info(
            "Aggregating raw_prices since %s (languages=%s, single conditions=%s)",
            since.date(), params["languages"], params["conditions"],
        )

        records: List[Dict[str, Any]] = []
        group_rows = 0
        async with AsyncSessionLocal() as session:
            result = await session.stream(stmt, params)

            current_key = None
            display: Tuple[str, str] = ("", "")
            days: List[DayAggregate] = []

            def flush() -> None:
                if current_key is None:
                    return
                record = self._build_record(current_key[2], display, days, now)
                if record:
                    records.append(record)

            async for partition in result.partitions(5000):
                for row in partition:
                    group_rows += 1
                    key = (row.name_key, row.set_key, row.category)
                    if key != current_key:
                        flush()
                        current_key, days = key, []
                    display = (row.product_name, row.product_set)
                    days.append(DayAggregate(
                        day=row.day,
                        median_price=float(row.median_price),
                        p10_price=float(row.p10_price),
                        min_price=float(row.min_price),
                        max_price=float(row.max_price),
                        listings=int(row.listings),
                        last_seen_at=row.last_seen_at,
                    ))
            flush()

        logger.info("Aggregated %s product-days into %s products", group_rows, len(records))
        if not records:
            logger.warning("No raw price data found in lookback window; keeping existing market_statistics")
            return 0

        async with AsyncSessionLocal() as session:
            async with session.begin():
                await session.execute(delete(MarketStats))
                for i in range(0, len(records), 1000):
                    await session.execute(insert(MarketStats), records[i:i + 1000])

        logger.info("Replaced market_statistics with %s rows", len(records))
        return len(records)

    def _build_record(
        self,
        category: str,
        display: Tuple[str, str],
        days: List[DayAggregate],
        now: datetime,
    ) -> Optional[Dict[str, Any]]:
        stats = product_stats(days, now.date(), self.config)
        if stats is None:
            return None
        product_name, product_set = display
        price_cols = (
            "avg_price_7d", "min_price_7d", "max_price_7d",
            "avg_price_30d", "min_price_30d", "max_price_30d",
            "current_price", "floor_price_30d",
            "price_trend_7d", "price_trend_30d", "volume_trend_7d", "volume_trend_30d",
            "liquidity_score", "volatility",
        )
        record: Dict[str, Any] = {
            "product_name": product_name,
            "product_set": product_set,
            "category": category,
            "calculated_at": now,
        }
        for col, value in stats.items():
            record[col] = _dec(value) if col in price_cols else value
        return record
