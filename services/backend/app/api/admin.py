"""
Admin-only endpoints for operations dashboard.
"""

import logging
from typing import Any, List

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.dependencies import get_current_admin_user
from app.models.user import User
from app.schemas.admin import AdminStatsResponse, ScrapeLogRow, UserSummary

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


async def _scalar(db: AsyncSession, sql: str, params: dict | None = None) -> Any:
    r = await db.execute(text(sql), params or {})
    return r.scalar()


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    _: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Aggregated database stats and recent activity for the internal dashboard.
    """
    users_total = int(await _scalar(db, "SELECT COUNT(*) FROM users") or 0)
    users_verified = int(await _scalar(db, "SELECT COUNT(*) FROM users WHERE is_verified = true") or 0)

    role_rows = (await db.execute(text("SELECT role, COUNT(*) FROM users GROUP BY role"))).all()
    users_by_role = {row[0] or "unknown": row[1] for row in role_rows}

    raw_prices_count = int(await _scalar(db, "SELECT COUNT(*) FROM raw_prices") or 0)
    raw_distinct_cards = int(
        await _scalar(db, "SELECT COUNT(DISTINCT card_name) FROM raw_prices") or 0
    )

    signals_active = int(
        await _scalar(db, "SELECT COUNT(*) FROM signals WHERE is_active = true") or 0
    )
    deal_scores_active = int(
        await _scalar(db, "SELECT COUNT(*) FROM deal_scores WHERE is_active = true") or 0
    )

    last_scrapes: List[ScrapeLogRow] = []
    try:
        scrape_result = await db.execute(
            text(
                """
                SELECT source, status, items_scraped, errors_count, started_at, completed_at, error_message
                FROM scrape_logs
                ORDER BY COALESCE(started_at, created_at) DESC NULLS LAST
                LIMIT 15
                """
            )
        )
        for row in scrape_result.mappings().all():
            last_scrapes.append(
                ScrapeLogRow(
                    source=row.get("source"),
                    status=row.get("status"),
                    items_scraped=row.get("items_scraped"),
                    errors_count=row.get("errors_count"),
                    started_at=row.get("started_at"),
                    completed_at=row.get("completed_at"),
                    error_message=(row.get("error_message") or "")[:500] or None,
                )
            )
    except Exception as exc:
        logger.warning("admin stats: scrape_logs unavailable: %s", exc)

    recent_users: List[UserSummary] = []
    ru = await db.execute(
        text(
            """
            SELECT id, email, role, is_verified, created_at
            FROM users
            ORDER BY created_at DESC NULLS LAST
            LIMIT 25
            """
        )
    )
    for row in ru.mappings().all():
        recent_users.append(
            UserSummary(
                id=row["id"],
                email=row["email"],
                role=row["role"] or "free",
                is_verified=bool(row["is_verified"]),
                created_at=row["created_at"],
            )
        )

    return AdminStatsResponse(
        users_total=users_total,
        users_verified=users_verified,
        users_by_role=users_by_role,
        raw_prices_count=raw_prices_count,
        raw_distinct_cards=raw_distinct_cards,
        signals_active=signals_active,
        deal_scores_active=deal_scores_active,
        last_scrapes=last_scrapes,
        recent_users=recent_users,
    )
