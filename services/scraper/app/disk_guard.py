"""
Keep the scraper from filling the database volume (it did in November 2026).

The Railway volume is 5 GB (4.6 GB usable) and Postgres crashes when it is
full. The analysis prunes raw_prices after every run, but when the analysis
fails nothing would stop the scrapes from piling up. So the scraper:

- removes listings older than RAW_PRICES_MAX_AGE_HOURS itself before it
  starts (a backstop; normally the analysis has already done this), and
- checks the database size before and during the scrape and stops storing
  above SCRAPE_STOP_DB_GB, leaving room for WAL and temporary files.

A stopped scrape is logged in scrape_logs as failed with the reason, so the
analysis' ops alert reports it.
"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.config_cardtrader import config
from app.database import AsyncSessionLocal, engine

logger = logging.getLogger(__name__)


def too_big_message(db_gb: float) -> str:
    return (
        f"Database {db_gb:.2f} GB is above the scrape limit of {config.SCRAPE_STOP_DB_GB:.1f} GB: "
        "scrape stopped to keep the volume from filling up"
    )


async def database_gb() -> float:
    async with AsyncSessionLocal() as session:
        size = (await session.execute(text("SELECT pg_database_size(current_database())"))).scalar() or 0
    return size / 1024 ** 3


async def prune_stale_raw_prices() -> int:
    """Delete raw_prices older than RAW_PRICES_MAX_AGE_HOURS, in short batches, then VACUUM."""
    hours = config.RAW_PRICES_MAX_AGE_HOURS
    if hours <= 0:
        return 0
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = text(
        "DELETE FROM raw_prices WHERE id IN "
        "(SELECT id FROM raw_prices WHERE scraped_at < :cutoff ORDER BY id LIMIT :lim)"
    )
    total = 0
    for _ in range(1000):
        async with AsyncSessionLocal() as session:
            result = await session.execute(stmt, {"cutoff": cutoff, "lim": 50000})
            await session.commit()
        n = result.rowcount or 0
        total += n
        if n <= 0:
            break
    if total:
        logger.info("Removed %s raw_prices rows older than %s h before scraping", total, hours)
        try:
            async with engine.connect() as conn:
                conn = await conn.execution_options(isolation_level="AUTOCOMMIT")
                await conn.execute(text("VACUUM raw_prices"))
        except Exception as e:
            logger.warning("VACUUM raw_prices failed (autovacuum will catch up): %s", e)
    return total
