"""
Watchdog: mail the operator when the analysis has stopped running.

The analysis service mails about failed scrapes and its own problems (see
analysis app/ops_alerts.py), but it can't report a run that never starts or
crashes on start-up. Market statistics are replaced every run (08:30 and
20:30 UTC), so when the newest one is older than STALE_AFTER the analysis is
stuck. It also watches the database size, because a full volume crashes
Postgres (November 2026) and the analysis can't warn when it isn't running.
Checked every six hours by the backend's scheduler.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import text

from app.config import settings
from app.core.email import send_mail
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

STALE_AFTER = timedelta(hours=14)
# The volume is 5 GB (4.6 usable); the scraper stops storing at 3.0 GB
DB_SIZE_WARN_GB = 2.5


def stale_message(last_run: Optional[datetime], now: datetime) -> Optional[str]:
    """Dutch problem description, or None while the analysis is up to date."""
    if last_run is None:
        return "Er staan geen marktstatistieken in de database: de analyse heeft nog nooit (goed) gedraaid."
    if last_run.tzinfo is None:
        last_run = last_run.replace(tzinfo=timezone.utc)
    age = now - last_run
    if age <= STALE_AFTER:
        return None
    hours = int(age.total_seconds() // 3600)
    return (
        f"De laatste analyse-run is {hours} uur geleden ({last_run:%d-%m %H:%M} UTC). "
        "De site toont verouderde prijzen; kijk in de Railway-logs van de analysis-service."
    )


def size_message(db_gb: Optional[float]) -> Optional[str]:
    """Dutch warning when the database nears the volume limit, else None."""
    if db_gb is None or db_gb < DB_SIZE_WARN_GB:
        return None
    return (
        f"De database is {db_gb:.2f} GB, boven de waarschuwingsgrens van {DB_SIZE_WARN_GB:.1f} GB. "
        "Het volume is 5 GB en Postgres crasht als het vol raakt; de scraper stopt zelf bij 3 GB. "
        "Kijk welke tabel groeit (meestal raw_prices) in de logs van de analysis-service."
    )


async def check_analysis_freshness() -> None:
    messages = []
    try:
        async with AsyncSessionLocal() as session:
            last_run = (await session.execute(text("SELECT max(calculated_at) FROM market_statistics"))).scalar()
            db_bytes = (await session.execute(text("SELECT pg_database_size(current_database())"))).scalar()
        messages.append(stale_message(last_run, datetime.now(timezone.utc)))
        messages.append(size_message(db_bytes / 1024 ** 3 if db_bytes is not None else None))
    except Exception as e:
        messages.append(f"De backend kon de database niet lezen: {e}")
    messages = [m for m in messages if m]
    if not messages:
        return
    for message in messages:
        logger.warning("Ops alert: %s", message)
    to = (settings.ALERT_EMAIL or settings.sender_email).strip()
    if to:
        text_body = "\n\n".join(messages)
        html = "".join(f"<p>{m}</p>" for m in messages)
        await run_in_threadpool(send_mail, to, "TCG Pulse: actie nodig", html, text_body)
