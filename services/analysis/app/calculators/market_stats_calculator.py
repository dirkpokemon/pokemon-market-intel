"""
Market Statistics Calculator
Calculates market metrics per product from the daily price history.

1. Postgres aggregates the recent raw_prices into one row per (product, set,
   category, variant, day) over comparable listings only (see
   INCLUDED_CONDITIONS / INCLUDED_LANGUAGES) and upserts them into daily_prices.
   raw_prices only keeps a few days (disk), daily_prices keeps the history.
2. The per-product math (scoring.product_stats) runs over the last
   LONG_WINDOW_DAYS of daily_prices.

Days that raw_prices no longer covers completely (the oldest day is partly
pruned) are never overwritten, so retention can't shrink a finished day.
Changing INCLUDED_LANGUAGES / INCLUDED_CONDITIONS only affects days aggregated
after the change.
"""

import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import delete, insert, text

from app.calculators.scoring import DayAggregate, product_stats
from app.config_analysis import analysis_config
from app.database import AsyncSessionLocal
from app.models.market_stats import MarketStats

logger = logging.getLogger(__name__)

DAILY_AGGREGATES_SQL = """
WITH base AS (
    SELECT
        regexp_replace(btrim(card_name), '\\s+', ' ', 'g') AS name_clean,
        COALESCE(NULLIF(regexp_replace(btrim(card_set), '\\s+', ' ', 'g'), ''), 'Unknown Set') AS set_clean,
        CASE WHEN card_number IS NULL THEN 'sealed' ELSE 'single' END AS category,
        COALESCE(card_number, '') AS card_key,
        collector_number,
        rarity,
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
    card_key,
    day,
    max(name_clean)   AS product_name,
    max(set_clean)    AS product_set,
    max(collector_number) AS collector_number,
    max(rarity)       AS rarity,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY price_eur) AS median_price,
    percentile_cont(0.1) WITHIN GROUP (ORDER BY price_eur) AS p10_price,
    min(price_eur)    AS min_price,
    max(price_eur)    AS max_price,
    count(*)          AS listings,
    max(scraped_at)   AS last_seen_at
FROM base
WHERE price_eur IS NOT NULL
  AND price_eur < 99999999
GROUP BY 1, 2, 3, 4, 5
"""

# Days before :refresh_from are only inserted when missing (first backfill):
# raw_prices no longer holds all of their listings.
UPSERT_DAILY_PRICES_SQL = """
INSERT INTO daily_prices (
    name_key, set_key, category, card_key, day,
    product_name, product_set, collector_number, rarity,
    median_price, p10_price, min_price, max_price, listings, last_seen_at, updated_at
)
SELECT
    name_key, set_key, category, card_key, day,
    product_name, product_set, collector_number, rarity,
    median_price, p10_price, min_price, max_price, listings, last_seen_at, now()
FROM ({aggregates}) agg
ON CONFLICT ON CONSTRAINT uq_daily_prices_product_day DO UPDATE SET
    product_name = EXCLUDED.product_name,
    product_set = EXCLUDED.product_set,
    collector_number = COALESCE(EXCLUDED.collector_number, daily_prices.collector_number),
    rarity = COALESCE(EXCLUDED.rarity, daily_prices.rarity),
    median_price = EXCLUDED.median_price,
    p10_price = EXCLUDED.p10_price,
    min_price = EXCLUDED.min_price,
    max_price = EXCLUDED.max_price,
    listings = EXCLUDED.listings,
    last_seen_at = EXCLUDED.last_seen_at,
    updated_at = now()
WHERE daily_prices.day >= :refresh_from
"""

HISTORY_SQL = """
SELECT name_key, set_key, category, card_key, day,
       product_name, product_set, collector_number, rarity,
       median_price, p10_price, min_price, max_price, listings, last_seen_at
FROM daily_prices
WHERE day > :since_day
ORDER BY name_key, set_key, category, card_key, day
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
        Update daily_prices from the recent raw_prices, then recalculate
        market_statistics for all products and replace the table contents in a
        single transaction, so API readers never see an empty or half-filled
        snapshot.

        Returns:
            Number of products saved
        """
        now = datetime.now(timezone.utc)
        await self.update_daily_prices(now)
        await self.prune_daily_prices(now.date())
        return await self.recalculate_stats(now)

    def _raw_window(self, now: datetime) -> Tuple[datetime, date]:
        """
        (scan raw_prices since, first day raw_prices still covers completely).
        """
        cfg = self.config
        retention = int(cfg.RAW_PRICES_RETENTION_DAYS)
        scan_days = min(retention, cfg.LONG_WINDOW_DAYS) if retention > 0 else cfg.LONG_WINDOW_DAYS
        since = now - timedelta(days=max(1, scan_days))
        refresh_from = since.date() + timedelta(days=1)
        return since, refresh_from

    async def update_daily_prices(self, now: datetime) -> int:
        cfg = self.config
        since, refresh_from = self._raw_window(now)
        rate_case, rate_params = _rate_case(cfg.CURRENCY_RATES)
        aggregates = DAILY_AGGREGATES_SQL.format(rate_case=rate_case)
        stmt = text(UPSERT_DAILY_PRICES_SQL.format(aggregates=aggregates))
        params = {
            "since": since,
            "refresh_from": refresh_from,
            "languages": [lang.upper() for lang in cfg.INCLUDED_LANGUAGES],
            "conditions": [c.lower() for c in cfg.INCLUDED_CONDITIONS],
            **rate_params,
        }
        logger.info(
            "Updating daily_prices from raw_prices since %s (days from %s refreshed; languages=%s, single conditions=%s)",
            since.isoformat(timespec="minutes"), refresh_from, params["languages"], params["conditions"],
        )
        async with AsyncSessionLocal() as session:
            async with session.begin():
                result = await session.execute(stmt, params)
        written = result.rowcount or 0
        logger.info("daily_prices: %s product-days inserted or refreshed", written)
        return written

    async def prune_daily_prices(self, today: date) -> int:
        days = int(self.config.DAILY_PRICES_RETENTION_DAYS)
        # Never prune inside the statistics window
        days = max(days, self.config.LONG_WINDOW_DAYS + 1)
        async with AsyncSessionLocal() as session:
            async with session.begin():
                result = await session.execute(
                    text("DELETE FROM daily_prices WHERE day < :cutoff"),
                    {"cutoff": today - timedelta(days=days)},
                )
        removed = result.rowcount or 0
        if removed:
            logger.info("daily_prices retention: removed %s rows older than %s days", removed, days)
        return removed

    async def recalculate_stats(self, now: datetime) -> int:
        cfg = self.config
        since_day = now.date() - timedelta(days=cfg.LONG_WINDOW_DAYS)
        logger.info("Calculating market statistics from daily_prices after %s", since_day)

        records: List[Dict[str, Any]] = []
        group_rows = 0
        async with AsyncSessionLocal() as session:
            result = await session.stream(text(HISTORY_SQL), {"since_day": since_day})

            current_key = None
            display: Dict[str, Any] = {}
            days: List[DayAggregate] = []

            def flush() -> None:
                if current_key is None:
                    return
                record = self._build_record(current_key[2], current_key[3], display, days, now)
                if record:
                    records.append(record)

            async for partition in result.partitions(5000):
                for row in partition:
                    group_rows += 1
                    key = (row.name_key, row.set_key, row.category, row.card_key)
                    if key != current_key:
                        flush()
                        current_key, days, display = key, [], {}
                    # Rows come oldest day first: later days win, but a label
                    # missing on newer rows keeps the last known value.
                    display["product_name"] = row.product_name
                    display["product_set"] = row.product_set
                    if row.collector_number:
                        display["collector_number"] = row.collector_number
                    if row.rarity:
                        display["rarity"] = row.rarity
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
            logger.warning("No price history in the statistics window; keeping existing market_statistics")
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
        card_key: str,
        display: Dict[str, Any],
        days: List[DayAggregate],
        now: datetime,
    ) -> Optional[Dict[str, Any]]:
        stats = product_stats(days, now.date(), self.config)
        if stats is None:
            return None
        price_cols = (
            "avg_price_7d", "min_price_7d", "max_price_7d",
            "avg_price_30d", "min_price_30d", "max_price_30d",
            "current_price", "floor_price_30d",
            "price_trend_7d", "price_trend_30d", "volume_trend_7d", "volume_trend_30d",
            "liquidity_score", "volatility", "floor_change_7d", "supply_change_7d",
        )
        record: Dict[str, Any] = {
            "product_name": display["product_name"],
            "product_set": display["product_set"],
            "category": category,
            "card_number": card_key,
            "collector_number": display.get("collector_number"),
            "rarity": display.get("rarity"),
            "calculated_at": now,
        }
        for col, value in stats.items():
            record[col] = _dec(value) if col in price_cols else value
        return record
