"""
Operator alerts: a short email to ALERT_EMAIL when a run goes wrong.

Checked at the end of every analysis run (twice a day, right after the
scrapes): did the latest CardTrader scrape run, succeed and bring in a normal
number of listings; did the statistics and deal scores come out; is the
database nearing the volume limit. The backend separately warns when the
analysis itself stops running (see backend app/jobs/watchdog.py). Problems are
always logged ("Ops alert: …"); the mail needs the Gmail API or SMTP settings.
"""

import html as html_module
import logging
from datetime import datetime, timedelta, timezone
from statistics import median
from typing import List, Optional, Sequence

from sqlalchemy import text

from app.config import settings
from app.config_analysis import analysis_config
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Scrapes run at 06:00 and 18:00 UTC; more than this without one means a run was missed
MAX_SCRAPE_AGE = timedelta(hours=14)
# A scrape with fewer listings than this share of the usual count is suspicious
MIN_SCRAPE_SHARE = 0.5


def scrape_problems(latest, previous_counts: Sequence[int], now: datetime) -> List[str]:
    """Problems with the latest scrape. `latest` has status, items_scraped,
    started_at and error_message (or is None); previous_counts are the listing
    counts of earlier successful scrapes."""
    if latest is None:
        return ["Er staat nog geen enkele CardTrader-scrape in scrape_logs."]
    problems = []
    started = latest.started_at
    if started is not None and started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    if started is None or now - started > MAX_SCRAPE_AGE:
        when = started.strftime("%d-%m %H:%M UTC") if started else "onbekend"
        problems.append(f"De laatste CardTrader-scrape is van {when}: er is een run overgeslagen of vastgelopen.")
    if latest.status != "success":
        detail = f" Fout: {latest.error_message[:300]}" if latest.error_message else ""
        problems.append(f"De laatste scrape eindigde met status '{latest.status}' ({latest.items_scraped or 0} listings).{detail}")
    elif previous_counts:
        usual = median(previous_counts)
        if usual and (latest.items_scraped or 0) < MIN_SCRAPE_SHARE * usual:
            problems.append(
                f"De laatste scrape bracht {latest.items_scraped or 0} listings binnen, normaal zo'n {int(usual)}."
            )
    return problems


def run_problems(stats_count: int, deal_count: int, db_gb: Optional[float]) -> List[str]:
    problems = []
    if stats_count == 0:
        problems.append("De marktstatistieken zijn niet berekend (0 producten): de site toont oude prijzen.")
    elif deal_count == 0:
        problems.append("De deal scores zijn niet berekend (0 deals).")
    if db_gb is not None and db_gb >= analysis_config.DB_SIZE_WARN_GB:
        problems.append(
            f"De database is {db_gb:.2f} GB, boven de waarschuwingsgrens van {analysis_config.DB_SIZE_WARN_GB:.1f} GB "
            "(het volume is 5 GB)."
        )
    return problems


async def _latest_scrape():
    async with AsyncSessionLocal() as session:
        rows = (await session.execute(text("""
            SELECT status, items_scraped, started_at, error_message
            FROM scrape_logs
            WHERE source = 'CardTrader'
            ORDER BY started_at DESC NULLS LAST
            LIMIT 7
        """))).fetchall()
    if not rows:
        return None, []
    previous = [r.items_scraped for r in rows[1:] if r.status == "success" and r.items_scraped]
    return rows[0], previous


async def check_and_alert(stats_count: int, deal_count: int, db_gb: Optional[float]) -> List[str]:
    """Collect this run's problems, log them and mail them. Never raises."""
    problems: List[str] = []
    try:
        latest, previous = await _latest_scrape()
        problems += scrape_problems(latest, previous, datetime.now(timezone.utc))
    except Exception as e:  # scrape_logs unreadable: say so rather than stay silent
        problems.append(f"scrape_logs kon niet gelezen worden: {e}")
    problems += run_problems(stats_count, deal_count, db_gb)
    if not problems:
        return []

    for p in problems:
        logger.warning("Ops alert: %s", p)
    to = (settings.ALERT_EMAIL or settings.sender_email).strip()
    if to:
        from app.generators.watchlist_notifier import _send_email_alert

        items = "".join(f"<li>{html_module.escape(p)}</li>" for p in problems)
        body = (
            "<p>De analyse-run van TCG Pulse vond het volgende:</p>"
            f"<ul>{items}</ul><p>Kijk in de Railway-logs van de Scraper- en analysis-service voor details.</p>"
        )
        plain = "De analyse-run van TCG Pulse vond het volgende:\n\n" + "\n".join(f"- {p}" for p in problems)
        try:
            await _send_email_alert(to, f"TCG Pulse: {len(problems)} probleem/problemen in de laatste run", body, plain, None)
        except Exception as e:
            logger.error("Ops alert mail failed: %s", e)
    return problems
