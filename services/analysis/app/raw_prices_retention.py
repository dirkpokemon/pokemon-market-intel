"""
Delete old raw_prices rows to cap Postgres disk use on small Railway volumes.

Runs in small batches with a fresh session per batch (short transactions).
"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.config_analysis import analysis_config
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


async def prune_raw_prices_older_than_retention() -> int:
    """
    Delete raw_prices with scraped_at older than RAW_PRICES_RETENTION_DAYS.

    Returns:
        Total rows deleted this run (across batches).
    """
    cfg = analysis_config
    days = int(cfg.RAW_PRICES_RETENTION_DAYS)
    if days <= 0:
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    batch_lim = max(1000, int(cfg.RAW_PRICES_PRUNE_BATCH_ROWS))
    max_batches = max(1, int(cfg.RAW_PRICES_PRUNE_MAX_BATCHES_PER_RUN))

    total = 0
    stmt = text(
        """
        DELETE FROM raw_prices
        WHERE id IN (
            SELECT id FROM raw_prices
            WHERE scraped_at < :cutoff
            ORDER BY id
            LIMIT :lim
        )
        """
    )

    for i in range(max_batches):
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                stmt, {"cutoff": cutoff, "lim": batch_lim}
            )
            await session.commit()
            n = result.rowcount or 0

        if n <= 0:
            break
        total += n
        if i == 0 or (i + 1) % 5 == 0:
            logger.info(
                "raw_prices retention: deleted %s rows so far (batch %s, cutoff=%s)",
                total,
                i + 1,
                cutoff.isoformat(),
            )

    if total:
        logger.info(
            "raw_prices retention: removed %s rows older than %s days (cutoff %s)",
            total,
            days,
            cutoff.isoformat(),
        )
    else:
        logger.info(
            "raw_prices retention: nothing to delete (retention=%s days)",
            days,
        )

    return total
