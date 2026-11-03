"""
Watchdog: mail the operator when the analysis has stopped running.

The analysis service mails about failed scrapes and its own problems (see
analysis app/ops_alerts.py), but it can't report a run that never starts or
crashes on start-up. Market statistics are replaced every run (07:30 and
19:30 UTC), so when the newest one is older than STALE_AFTER the analysis is
stuck. Checked every six hours by the backend's scheduler.
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


async def check_analysis_freshness() -> None:
    try:
        async with AsyncSessionLocal() as session:
            last_run = (await session.execute(text("SELECT max(calculated_at) FROM market_statistics"))).scalar()
        message = stale_message(last_run, datetime.now(timezone.utc))
    except Exception as e:
        message = f"De backend kon market_statistics niet lezen: {e}"
    if not message:
        return
    logger.warning("Ops alert: %s", message)
    to = (settings.ALERT_EMAIL or settings.sender_email).strip()
    if to:
        await run_in_threadpool(
            send_mail, to, "TCG Pulse: de analyse draait niet", f"<p>{message}</p>", message,
        )
