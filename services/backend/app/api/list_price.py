"""
List price (roadmap #2): paste a want/deck list, get the cheapest way to buy
it on CardTrader including estimated shipping.

POST /list-price  {text, country, condition, language}

1. parse_wantlist splits the text into (quantity, name) lines;
2. each line is matched to a product in market_statistics (same search as
   the price check), preferring an exact name match;
3. the current CardTrader listings of those products come from the latest
   scrape in raw_prices (per product, so a scrape in progress still works);
4. app/core/list_price.optimize bundles them per seller / CardTrader Zero.

Public with a small line limit; Plus/Business accounts get longer lists.
Sellers are shown as "Verkoper 1 (DE)": raw_prices only holds a pseudonymous
seller_key, which is never returned.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.price_check import _escape_like
from app.core.dependencies import get_optional_user
from app.core.language import LANGUAGE_PATTERN, RAW_LANG_SQL
from app.core.list_price import ZERO_BIN, Offer, WantLine, optimize, parse_wantlist
from app.core.price_check import search_terms
from app.core.rate_limit import RateLimiter
from app.data.set_registry import aliases_for_code
from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/list-price", tags=["List price"])

limit = RateLimiter(limit=10, window_seconds=60)

FREE_LINE_LIMIT = 10
PLUS_LINE_LIMIT = 60
OFFERS_PER_LINE = 30
# Listings older than this are not "current" (scrapes run twice a day)
MAX_LISTING_AGE_HOURS = 26

CONDITIONS = {
    "nm": ["near mint", "nm", "mint", "m"],
    "lp": ["near mint", "nm", "mint", "m", "slightly played", "lightly played", "excellent"],
}

SHIPPING_NOTE = (
    "Verzendkosten zijn een schatting: CardTrader publiceert geen verzendtarieven per verkoper. "
    "We rekenen met een brief of (boven €25) aangetekend pakketje per verkoper, en één vast bedrag "
    "voor CardTrader Zero. Controleer de echte kosten bij het afrekenen."
)


class ListPriceRequest(BaseModel):
    text: str = Field(..., min_length=2, max_length=10_000)
    country: str = Field(default="NL", pattern="^[A-Za-z]{2}$")
    condition: str = Field(default="nm", pattern="^(nm|lp)$")
    language: str = Field(default="EN", pattern=LANGUAGE_PATTERN)


class Product(BaseModel):
    product_name: str
    product_set: Optional[str] = None
    category: str
    card_number: Optional[str] = None
    rarity: Optional[str] = None


class LineResult(BaseModel):
    query: str
    quantity: int
    matched: Optional[Product] = None
    alternatives: List[Product] = []
    found: int = 0           # copies in the plan
    missing: int = 0         # copies we could not find in current listings


class ShipmentItem(BaseModel):
    line: int
    product_name: str
    product_set: Optional[str] = None
    price: float
    copies: int
    url: Optional[str] = None


class ShipmentOut(BaseModel):
    kind: str                # "seller" | "zero"
    label: str
    seller_country: Optional[str] = None
    items: List[ShipmentItem]
    subtotal: float
    shipping: float


class ListPriceResponse(BaseModel):
    lines: List[LineResult]
    shipments: List[ShipmentOut]
    cards_total: float
    shipping_total: float
    total: float
    naive_total: float
    savings: float
    line_limit: int
    truncated: int           # lines left out because of the line limit
    listings_as_of: Optional[datetime] = None
    shipping_note: str = SHIPPING_NOTE


# Search text per product: name, set, printed number and rarity (like the price check)
_HAYSTACK = (
    "(product_name || ' ' || COALESCE(product_set, '') || ' ' || COALESCE(collector_number, '')"
    " || ' ' || COALESCE(rarity, ''))"
)
# Printed number without "/197" and leading zeros, to compare with "125" or "TG05"
_NUMBER_SQL = "ltrim(upper(split_part(COALESCE(collector_number, ''), '/', 1)), '0')"


async def _match_line(db: AsyncSession, want: WantLine, language: str) -> List[Product]:
    """Products for one list line in this language, best match first.

    A deck export's set code and number ("OBF 125") pin the variant; without
    them the most observed product wins. When nothing matches, the number,
    then the set, then trailing name words are dropped.
    """
    terms = search_terms(want.query)
    if not terms:
        return []
    set_aliases = [a.lower() for a in aliases_for_code(want.set_code)]
    number = (want.number or "").upper().lstrip("0") or None
    base = {"full": want.query.strip().lower(), "lang": language,
            "aliases": set_aliases, "number": number}
    filters = []
    if set_aliases and number:
        filters.append((True, True))
    if number:
        filters.append((False, True))
    if set_aliases:
        filters.append((True, False))
    filters.append((False, False))

    for use_set, use_number in filters:
        for n in range(len(terms), 0, -1):
            conditions = [f"{_HAYSTACK} ILIKE :t{i} ESCAPE '\\'" for i in range(n)]
            if use_set:
                conditions.append("lower(COALESCE(product_set, '')) = ANY(:aliases)")
            if use_number:
                conditions.append(f"{_NUMBER_SQL} = :number")
            params = {**base, **{f"t{i}": f"%{_escape_like(t)}%" for i, t in enumerate(terms[:n])}}
            rows = (await db.execute(
                text(f"""
                    SELECT product_name, product_set, category, card_number, rarity
                    FROM market_statistics
                    WHERE {' AND '.join(conditions)}
                      AND COALESCE(language, 'EN') = :lang
                    ORDER BY (lower(product_name) = :full) DESC,
                             days_observed DESC NULLS LAST, volume_30d DESC NULLS LAST
                    LIMIT 5
                """),
                params,
            )).fetchall()
            if rows:
                return [
                    Product(
                        product_name=r.product_name,
                        product_set=r.product_set,
                        category=r.category or "single",
                        card_number=r.card_number or None,
                        rarity=r.rarity,
                    )
                    for r in rows
                ]
    return []


def _sealed_key(name: Optional[str], card_set: Optional[str]) -> str:
    return f"{(name or '').strip().lower()}|{(card_set or '').strip().lower()}"


@router.post("", response_model=ListPriceResponse, dependencies=[Depends(limit)])
async def list_price(
    body: ListPriceRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> ListPriceResponse:
    wanted = parse_wantlist(body.text)
    if not wanted:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Geen kaarten gevonden. Zet één kaart per regel, bijvoorbeeld '4 Charizard ex'.")
    line_limit = PLUS_LINE_LIMIT if user is not None and user.is_premium() else FREE_LINE_LIMIT
    truncated = max(0, len(wanted) - line_limit)
    wanted = wanted[:line_limit]

    lines: List[LineResult] = []
    for w in wanted:
        matches = await _match_line(db, w, body.language)
        lines.append(LineResult(
            query=w.query, quantity=w.quantity,
            matched=matches[0] if matches else None,
            alternatives=matches[1:],
        ))

    # Lines for the same product ("Pikachu" and "Pikachu 025") share listings, so
    # the optimizer sees one demand per product: a listing's stock counts once.
    groups: List[List[int]] = []          # product group -> its lines, in list order
    single_lines: Dict[str, int] = {}     # card_number -> group
    sealed_lines: Dict[str, int] = {}     # sealed key -> group
    for i, line in enumerate(lines):
        p = line.matched
        if p is None:
            continue
        index = single_lines if p.card_number else sealed_lines
        key = p.card_number or _sealed_key(p.product_name, p.product_set)
        if key not in index:
            index[key] = len(groups)
            groups.append([])
        groups[index[key]].append(i)

    rows = []
    if single_lines or sealed_lines:
        result = await db.execute(
            text(f"""
                WITH cand AS (
                    SELECT card_name, card_set, card_number, price, stock_quantity,
                           seller_key, seller_country, ships_via_zero, source_url, scraped_at,
                           max(scraped_at) OVER (
                               PARTITION BY COALESCE(card_number, lower(card_name) || '|' || lower(COALESCE(card_set, '')))
                           ) AS latest
                    FROM raw_prices
                    WHERE scraped_at >= :since
                      AND source = 'CardTrader'
                      AND seller_key IS NOT NULL
                      AND graded IS NOT TRUE
                      AND price > 0
                      AND upper(COALESCE(currency, 'EUR')) = 'EUR'
                      AND {RAW_LANG_SQL} = :language
                      AND (card_number IS NULL OR lower(btrim(condition)) = ANY(:conditions))
                      AND (card_number = ANY(:cards)
                           OR (card_number IS NULL AND lower(card_name) = ANY(:sealed_names)))
                )
                SELECT * FROM cand
                WHERE scraped_at >= latest - interval '15 minutes'
                ORDER BY price
            """),
            {
                "since": datetime.now(timezone.utc) - timedelta(hours=MAX_LISTING_AGE_HOURS),
                "language": body.language.upper(),
                "conditions": CONDITIONS[body.condition],
                "cards": list(single_lines.keys()),
                "sealed_names": list({k.split("|", 1)[0] for k in sealed_lines}),
            },
        )
        rows = result.fetchall()

    offers: List[Offer] = []
    offer_urls: List[Optional[str]] = []
    per_group: Dict[int, int] = {}
    as_of: Optional[datetime] = None
    for r in rows:
        group = (single_lines.get(r.card_number) if r.card_number
                 else sealed_lines.get(_sealed_key(r.card_name, r.card_set)))
        if group is None or per_group.get(group, 0) >= OFFERS_PER_LINE:
            continue
        per_group[group] = per_group.get(group, 0) + 1
        offers.append(Offer(
            line=group, price=float(r.price), quantity=max(1, int(r.stock_quantity or 1)),
            seller_key=r.seller_key, seller_country=r.seller_country,
            ships_via_zero=bool(r.ships_via_zero), ref=len(offers),
        ))
        offer_urls.append(r.source_url)
        if as_of is None or r.scraped_at > as_of:
            as_of = r.scraped_at

    needs = [sum(lines[i].quantity for i in g) for g in groups]
    plan = await run_in_threadpool(optimize, needs, offers, body.country)

    def take(group: int, copies: int) -> int:
        """Book bought copies on the group's lines in list order; the first line taking them."""
        first = None
        for i in groups[group]:
            if copies <= 0:
                break
            n = min(copies, lines[i].quantity - lines[i].found)
            if n > 0:
                lines[i].found += n
                copies -= n
                first = i if first is None else first
        return first if first is not None else groups[group][0]

    shipments: List[ShipmentOut] = []
    seller_no = 0
    for sh in plan.shipments:
        items = []
        for offer_idx, copies in sh.items:
            o = offers[offer_idx]
            line_idx = take(o.line, copies)
            matched = lines[line_idx].matched
            items.append(ShipmentItem(
                line=line_idx,
                product_name=matched.product_name if matched else lines[line_idx].query,
                product_set=matched.product_set if matched else None,
                price=o.price, copies=copies, url=offer_urls[o.ref],
            ))
        if sh.bin == ZERO_BIN:
            label = "CardTrader Zero"
        else:
            seller_no += 1
            label = f"Verkoper {seller_no}" + (f" ({sh.seller_country})" if sh.seller_country else "")
        shipments.append(ShipmentOut(
            kind="zero" if sh.bin == ZERO_BIN else "seller", label=label,
            seller_country=sh.seller_country, items=items,
            subtotal=sh.subtotal, shipping=sh.shipping,
        ))
    for line in lines:
        line.missing = line.quantity - line.found

    return ListPriceResponse(
        lines=lines,
        shipments=shipments,
        cards_total=plan.cards_total,
        shipping_total=plan.shipping_total,
        total=plan.total,
        naive_total=plan.naive_total,
        savings=round(max(0.0, plan.naive_total - plan.total), 2),
        line_limit=line_limit,
        truncated=truncated,
        listings_as_of=as_of,
    )

