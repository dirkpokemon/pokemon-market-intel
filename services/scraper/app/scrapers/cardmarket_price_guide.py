"""
Cardmarket's public price guide (no API account needed).

Cardmarket publishes the price guide of every game as a file, rebuilt once a
night (~02:45 CET); the API that used to serve it no longer takes new users.
The import replaces cardmarket_prices with the newest file and skips the work
when that file was already imported (the scraper runs twice a day).
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy import text

from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

POKEMON_GAME_ID = 6
PRICE_GUIDE_URL = f"https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_{POKEMON_GAME_ID}.json"
BATCH = 5000


def _num(v: Any) -> Optional[float]:
    return float(v) if isinstance(v, (int, float)) and v >= 0 else None


def parse_guide(data: Dict[str, Any]) -> tuple[Optional[datetime], List[Dict[str, Any]]]:
    """(createdAt, rows) from the downloaded JSON; rows without a product id are skipped."""
    created = data.get("createdAt")
    created_at = datetime.strptime(created, "%Y-%m-%dT%H:%M:%S%z") if created else None
    rows = []
    for g in data.get("priceGuides") or []:
        if not isinstance(g.get("idProduct"), int):
            continue
        rows.append({
            "id_product": g["idProduct"],
            "id_category": g.get("idCategory"),
            "avg": _num(g.get("avg")),
            "low": _num(g.get("low")),
            "trend": _num(g.get("trend")),
            "avg1": _num(g.get("avg1")),
            "avg7": _num(g.get("avg7")),
            "avg30": _num(g.get("avg30")),
            "created": created_at,
        })
    return created_at, rows


async def import_price_guide() -> int:
    """Download and store the newest price guide. Returns the rows imported (0 = unchanged)."""
    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
        response = await client.get(PRICE_GUIDE_URL)
        response.raise_for_status()
        created_at, rows = parse_guide(response.json())
    if not rows:
        logger.warning("Cardmarket price guide is empty, keeping the previous one")
        return 0

    async with AsyncSessionLocal() as session, session.begin():
        current = (await session.execute(text("SELECT max(guide_created_at) FROM cardmarket_prices"))).scalar()
        if current is not None and created_at is not None and current >= created_at:
            logger.info("Cardmarket price guide of %s already imported", created_at.isoformat())
            return 0
        # Full replacement in one transaction. DELETE rather than TRUNCATE: card
        # pages keep reading the old rows until the commit instead of waiting
        # on TRUNCATE's exclusive lock (autovacuum reclaims the old rows).
        await session.execute(text("DELETE FROM cardmarket_prices"))
        for i in range(0, len(rows), BATCH):
            await session.execute(
                text("""
                    INSERT INTO cardmarket_prices
                        (id_product, id_category, avg, low, trend, avg1, avg7, avg30, guide_created_at)
                    VALUES (:id_product, :id_category, :avg, :low, :trend, :avg1, :avg7, :avg30, :created)
                """),
                rows[i:i + BATCH],
            )
    logger.info("Cardmarket price guide of %s imported: %d products", created_at, len(rows))
    return len(rows)


async def save_cardmarket_map(pairs: List[tuple[str, int]], card_numbers: List[str]) -> None:
    """Store (CardTrader card_number, Cardmarket idProduct) pairs from blueprint.card_market_ids.

    card_numbers are all blueprints the pairs were read from: their old
    mappings are replaced, so ids CardTrader corrected or removed disappear.
    """
    if not card_numbers:
        return
    async with AsyncSessionLocal() as session, session.begin():
        await session.execute(
            text("DELETE FROM cardmarket_map WHERE card_number = ANY(:cards)"), {"cards": card_numbers}
        )
        for i in range(0, len(pairs), BATCH):
            await session.execute(
                text("""
                    INSERT INTO cardmarket_map (card_number, id_product, updated_at)
                    VALUES (:card, :product, now())
                    ON CONFLICT (card_number, id_product) DO UPDATE SET updated_at = now()
                """),
                [{"card": c, "product": p} for c, p in pairs[i:i + BATCH]],
            )
