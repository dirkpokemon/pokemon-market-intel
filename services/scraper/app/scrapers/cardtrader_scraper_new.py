"""
CardTrader Scraper - WORKING VERSION
Scrapes Pokemon card listings from CardTrader.com via API

API Structure:
1. GET /api/v2/expansions (all Pokemon expansions)
2. GET /api/v2/blueprints?expansion_id={id} (cards in expansion)
3. GET /api/v2/marketplace/products?blueprint_id={id} (actual listings with prices)
"""

import hashlib
import hmac
import logging
import asyncio
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from decimal import Decimal

import httpx

from app.models.raw_price import RawPrice
from app.models.scrape_log import ScrapeLog
from app.config import settings
from app.config_cardtrader import config
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Keywords that identify a blueprint as a sealed product rather than a single card.
# CardTrader uses the same blueprints endpoint for both — we detect by name.
SEALED_KEYWORDS = [
    'booster box', 'display box', 'booster display',
    'elite trainer box', 'etb', 'trainer box',
    'blister pack', 'blister',
    'tin', 'collection box', 'gift box',
    'premium collection', 'special collection',
    'poster collection', 'figure collection',
    'bundle', 'starter deck', 'theme deck',
    'v box', 'vmax box', 'ex box',
    'booster bundle',
    # Extended sealed product types
    'build & battle', 'build and battle',
    'mini tin', 'pokeball tin', 'poke ball tin',
    'advent calendar',
    'sleeved booster',
    'booster case', 'display case',
    '3-pack', '3 pack',
    'binder',
    'playmat',
    'pin collection', 'pin box',
    'collector chest', 'collection chest',
    'ultra premium', 'upc',
    'league battle deck',
]

_SEALED_RE = re.compile(
    r"\b(" + "|".join(re.escape(kw) for kw in SEALED_KEYWORDS) + r")\b",
    re.IGNORECASE,
)


def _is_sealed_product(name: str) -> bool:
    """Return True if the blueprint name looks like a sealed product."""
    return bool(_SEALED_RE.search(name or ""))


# Target modern English TCG sets using multi-word fragments that are unique to English releases
# Single-word keywords cause false positives ("Black" matches "Wizards Black Star Promos", etc.)
ENGLISH_SET_PHRASES = [
    # Scarlet & Violet series (2023-present)
    'Scarlet & Violet', 'Paldea', 'Obsidian Flames', 'Paradox Rift', 'Temporal Forces',
    'Twilight Masquerade', 'Stellar Crown', 'Shrouded Fable', 'Surging Sparks',
    'Prismatic Evolutions', 'Journey Together', 'Destined Rivals',
    'Terastal Festival', 'Mask of Change', 'Clay Burst', 'Wild Force',
    'Indigo Disk', 'Iron Leaves', 'Charizard ex Special',
    # Sword & Shield series (2020-2023)
    'Sword & Shield', 'Rebel Clash', 'Darkness Ablaze', 'Vivid Voltage',
    'Shining Fates', 'Battle Styles', 'Chilling Reign', 'Evolving Skies',
    'Fusion Strike', 'Brilliant Stars', 'Astral Radiance', 'Pokémon GO',
    'Lost Origin', 'Silver Tempest', 'Crown Zenith',
    # Sun & Moon series (2017-2020)
    'Sun & Moon', 'Guardians Rising', 'Burning Shadows', 'Crimson Invasion',
    'Ultra Prism', 'Forbidden Light', 'Celestial Storm', 'Dragon Majesty',
    'Team Up', 'Unbroken Bonds', 'Unified Minds', 'Hidden Fates',
    'Cosmic Eclipse',
]


def _blueprint_details(blueprint: Dict[str, Any]) -> tuple:
    """
    Printed collector number and rarity of a blueprint. Several cards in one
    set share a name ("Charizard ex" regular vs. special illustration rare),
    so these tell the variants apart for users. CardTrader keeps them in
    fixed_properties; the exact keys are read defensively.
    """
    fixed = blueprint.get("fixed_properties") or {}
    number = fixed.get("collector_number") or fixed.get("number") or blueprint.get("collector_number")
    rarity = (
        fixed.get("pokemon_rarity") or fixed.get("rarity")
        or blueprint.get("rarity") or blueprint.get("version")
    )
    return (str(number)[:50] if number else None, str(rarity)[:100] if rarity else None)


# Listing fields whose values are safe to log: shipping/hub capabilities and
# seller type/location. Seller names and ids are personal data and are never logged.
_LOGGABLE_LISTING_HINTS = ("country", "hub", "zero", "ship", "type", "level", "grade", "company", "language", "condition")


def _describe_listing(listing: Dict[str, Any]) -> Dict[str, Any]:
    """
    Field names (and only non-identifying values) of one marketplace listing,
    logged once per run to learn which seller/shipping fields CardTrader sends
    before the list-price optimizer (roadmap #2) relies on them.
    """
    def describe(obj: Dict[str, Any]) -> Dict[str, Any]:
        out: Dict[str, Any] = {}
        for key, value in obj.items():
            if isinstance(value, dict):
                out[key] = describe(value)
            elif any(hint in key.lower() for hint in _LOGGABLE_LISTING_HINTS):
                out[key] = value
            else:
                out[key] = type(value).__name__
        return out

    return describe(listing)


def _seller_fields(listing: Dict[str, Any], is_sealed: bool) -> tuple:
    """
    (seller_key, seller_country, ships_via_zero) for the list-price optimizer.
    seller_key is an HMAC of the CardTrader user id, so listings of one seller
    can be bundled without storing who the seller is.
    """
    user = listing.get('user') or {}
    user_id = user.get('id')
    seller_key = None
    if user_id is not None:
        seller_key = hmac.new(
            settings.SELLER_KEY_SECRET.encode(), f"cardtrader:{user_id}".encode(), hashlib.sha256,
        ).hexdigest()[:16]
    country = user.get('country_code')
    country = str(country).upper()[:2] if country else None
    zero_flag = user.get('can_sell_sealed_with_ct_zero') if is_sealed else user.get('can_sell_via_hub')
    ships_via_zero = bool(zero_flag) if zero_flag is not None else None
    return seller_key, country, ships_via_zero


def _is_target_set(name: str) -> bool:
    return any(phrase.lower() in name.lower() for phrase in ENGLISH_SET_PHRASES)


# Retry policy for a single API call: rate limits (429), server errors and
# network timeouts are retried with exponential backoff; other 4xx are not.
MAX_ATTEMPTS = 5
BACKOFF_BASE_SECONDS = 2.0
RETRYABLE_STATUS = {429, 500, 502, 503, 504}

# Abort the run when the API keeps failing (token revoked, API down) instead
# of grinding through tens of thousands of doomed requests.
MAX_CONSECUTIVE_FAILURES = 25


class CardTraderAuthError(Exception):
    """The API token was rejected; retrying or continuing is pointless."""


class CardTraderScraperV2:
    """
    CardTrader API scraper for Pokemon cards
    """
    
    def __init__(self):
        self.api_base = config.API_BASE_URL
        self.api_token = config.CARDTRADER_API_TOKEN
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        self.total_listings_scraped = 0
        self.skipped_on_vacation = 0
        self.total_blueprints_processed = 0
        self.errors_count = 0
        self.last_error: Optional[str] = None
        self._consecutive_failures = 0
        self._logged_blueprint_shape = False
        self._logged_listing_shape = False
        self._logged_graded_shape = False
    
    async def scrape_all(self) -> int:
        """
        Main scraper entry point. Failures of a single expansion or blueprint
        are logged and skipped; the run is recorded in scrape_logs whatever happens.
        
        Returns:
            Total number of listings scraped
        """
        logger.info("=" * 60)
        logger.info("Starting CardTrader API Scraper")
        logger.info("=" * 60)
        
        self.total_listings_scraped = 0
        self.skipped_on_vacation = 0
        self.total_blueprints_processed = 0
        self.errors_count = 0
        self.last_error = None
        self._consecutive_failures = 0
        start_time = datetime.utcnow()
        status = "success"

        if not self.api_token:
            logger.error("CARDTRADER_API_TOKEN is not set — skipping CardTrader scrape")
            self.last_error = "CARDTRADER_API_TOKEN is not set"
            await self._write_scrape_log(start_time, "failed")
            return 0

        try:
            async with httpx.AsyncClient(
                base_url=self.api_base, headers=self.headers, timeout=config.REQUEST_TIMEOUT
            ) as client:
                # Step 1: Get Pokemon expansions
                expansions = await self._fetch_pokemon_expansions(client)
                logger.info(f"Found {len(expansions)} Pokemon expansions")

                target_sets = [e for e in expansions if _is_target_set(e.get('name', ''))]
                # Also include the 20 most recent expansions to catch brand-new releases
                seen_ids = {e['id'] for e in target_sets}
                newest_20 = [e for e in expansions[-20:] if e['id'] not in seen_ids]
                recent_expansions = target_sets + newest_20
                logger.info(f"Processing {len(recent_expansions)} expansions ({len(target_sets)} target English sets + {len(newest_20)} newest)")
                if newest_20:
                    logger.warning(
                        f"⚠️  {len(newest_20)} newest expansions not matched by ENGLISH_SET_PHRASES — "
                        f"may be new releases. Review and add to set_registry if relevant:"
                    )
                    for exp in newest_20:
                        logger.warning(f"   UNKNOWN_EXPANSION | name='{exp.get('name_en') or exp.get('name')}' id={exp['id']}")

                # Step 2: For each expansion, get blueprints and marketplace listings
                for i, expansion in enumerate(recent_expansions, 1):
                    expansion_name = expansion.get('name', '?')
                    logger.info(f"[{i}/{len(recent_expansions)}] Processing: {expansion_name}")

                    blueprints = await self._fetch_or_skip(
                        self._fetch_blueprints(client, expansion['id']),
                        f"blueprints for expansion {expansion['id']} ({expansion_name})",
                    )
                    if blueprints is None:
                        continue
                    logger.info(f"  Found {len(blueprints)} blueprints")
                    if blueprints and not self._logged_blueprint_shape:
                        # Once per run, to verify which fields CardTrader sends
                        first = blueprints[0]
                        logger.info(
                            "Blueprint shape: keys=%s fixed_properties=%s",
                            sorted(first.keys()), first.get("fixed_properties"),
                        )
                        self._logged_blueprint_shape = True

                    for blueprint in blueprints:
                        listings = await self._fetch_or_skip(
                            self._fetch_marketplace_listings(client, blueprint['id']),
                            f"listings for blueprint {blueprint['id']}",
                        )

                        if listings:
                            if not self._logged_listing_shape:
                                logger.info("Listing shape: %s", _describe_listing(listings[0]))
                                self._logged_listing_shape = True
                            if not self._logged_graded_shape:
                                graded = next((l for l in listings if l.get('graded')), None)
                                if graded is not None:
                                    # Once per run: which grading fields CardTrader sends (roadmap #4)
                                    logger.info("Graded listing shape: %s", _describe_listing(graded))
                                    self._logged_graded_shape = True
                            await self._save_listings(listings, blueprint, expansion)
                            self.total_blueprints_processed += 1

                            # Log progress every 10 blueprints
                            if self.total_blueprints_processed % 10 == 0:
                                logger.info(f"    Progress: {self.total_blueprints_processed} blueprints, {self.total_listings_scraped} listings")

                        # Be respectful to the API between marketplace calls
                        await asyncio.sleep(config.MIN_DELAY_SECONDS)

            if self.errors_count:
                status = "partial"
        except Exception as e:
            logger.error(f"Scraper failed: {e}", exc_info=True)
            self.errors_count += 1
            self.last_error = str(e)
            status = "partial" if self.total_listings_scraped else "failed"

        if status == "success" and self.total_listings_scraped == 0:
            status = "no_data"

        duration = (datetime.utcnow() - start_time).total_seconds()
        logger.info("=" * 60)
        logger.info(f"CardTrader scrape finished: {status}")
        logger.info(f"   Blueprints processed: {self.total_blueprints_processed}")
        logger.info(f"   Listings scraped: {self.total_listings_scraped}")
        logger.info(f"   Skipped (seller on vacation): {self.skipped_on_vacation}")
        logger.info(f"   Errors: {self.errors_count}")
        logger.info(f"   Duration: {duration:.1f}s")
        logger.info("=" * 60)

        await self._write_scrape_log(start_time, status)
        return self.total_listings_scraped

    async def _write_scrape_log(self, start_time: datetime, status: str) -> None:
        end_time = datetime.utcnow()
        try:
            async with AsyncSessionLocal() as session:
                session.add(ScrapeLog(
                    source="CardTrader",
                    started_at=start_time,
                    completed_at=end_time,
                    duration_seconds=int((end_time - start_time).total_seconds()),
                    items_scraped=self.total_listings_scraped,
                    errors_count=self.errors_count,
                    error_message=(self.last_error or None) and self.last_error[:2000],
                    status=status,
                ))
                await session.commit()
        except Exception as e:
            logger.error(f"Could not write scrape log: {e}")

    async def _fetch_or_skip(self, coro, what: str):
        """
        Await one API call; on failure log it, count it and return None so the
        caller skips this item. Auth errors and long failure streaks abort the run.
        """
        try:
            result = await coro
            self._consecutive_failures = 0
            return result
        except CardTraderAuthError:
            raise
        except Exception as e:
            self.errors_count += 1
            self._consecutive_failures += 1
            self.last_error = f"{what}: {e}"
            logger.warning(f"Skipping {what}: {e}")
            if self._consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                raise RuntimeError(
                    f"Aborting: {self._consecutive_failures} consecutive API failures (last: {e})"
                ) from e
            return None

    async def _get(self, client: httpx.AsyncClient, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """GET with retries on 429/5xx/network errors (honours Retry-After)."""
        for attempt in range(1, MAX_ATTEMPTS + 1):
            delay = BACKOFF_BASE_SECONDS * (2 ** (attempt - 1))
            try:
                response = await client.get(path, params=params)
            except (httpx.TimeoutException, httpx.TransportError) as e:
                if attempt == MAX_ATTEMPTS:
                    raise
                logger.info(f"Network error on {path} ({e}); retry {attempt}/{MAX_ATTEMPTS - 1} in {delay:.0f}s")
                await asyncio.sleep(delay)
                continue

            if response.status_code in (401, 403):
                raise CardTraderAuthError(
                    f"CardTrader API rejected the token (HTTP {response.status_code})"
                )
            if response.status_code in RETRYABLE_STATUS and attempt < MAX_ATTEMPTS:
                retry_after = response.headers.get("Retry-After")
                if retry_after and retry_after.isdigit():
                    delay = max(delay, float(retry_after))
                logger.info(
                    f"HTTP {response.status_code} on {path}; retry {attempt}/{MAX_ATTEMPTS - 1} in {delay:.0f}s"
                )
                await asyncio.sleep(delay)
                continue

            response.raise_for_status()
            return response.json()

    async def _fetch_pokemon_expansions(self, client: httpx.AsyncClient) -> List[Dict[str, Any]]:
        """
        Fetch all Pokemon expansions (game_id=5)
        """
        all_expansions = await self._get(client, "/expansions")
        return [exp for exp in all_expansions if exp.get('game_id') == 5]

    async def _fetch_blueprints(self, client: httpx.AsyncClient, expansion_id: int) -> List[Dict[str, Any]]:
        """
        Fetch all blueprints (cards) for a given expansion
        """
        return await self._get(client, "/blueprints", {"expansion_id": expansion_id})

    async def _fetch_marketplace_listings(self, client: httpx.AsyncClient, blueprint_id: int) -> List[Dict[str, Any]]:
        """
        Fetch marketplace listings for a given blueprint

        Response is a dict keyed by blueprint id:
        {"<blueprint_id>": [{"id": ..., "price_cents": 499, "price_currency": "EUR", "quantity": 10, ...}]}
        """
        data = await self._get(client, "/marketplace/products", {"blueprint_id": blueprint_id})
        if isinstance(data, dict) and str(blueprint_id) in data:
            return data[str(blueprint_id)]
        return []

    async def _save_listings(
        self,
        listings: List[Dict[str, Any]],
        blueprint: Dict[str, Any],
        expansion: Dict[str, Any]
    ):
        """
        Save listings to database
        """
        async with AsyncSessionLocal() as session:
            for listing in listings:
                # A seller on vacation can't ship: not a real offer
                if listing.get('on_vacation'):
                    self.skipped_on_vacation += 1
                    continue
                try:
                    # Extract data
                    price_cents = listing.get('price_cents', 0)
                    price = Decimal(price_cents) / Decimal(100)  # Convert cents to euros
                    currency = listing.get('price_currency', 'EUR')
                    quantity = listing.get('quantity', 0)
                    
                    # Get card name
                    card_name = listing.get('name_en') or blueprint.get('name', 'Unknown')
                    
                    # Get language
                    properties = listing.get('properties_hash', {})
                    language = properties.get('pokemon_language', 'EN').upper()
                    
                    # Condition (if available)
                    condition = properties.get('condition', 'NM')
                    
                    # Detect sealed products: leave card_number=None so the
                    # analysis engine sets category='sealed' automatically.
                    is_sealed = _is_sealed_product(card_name)
                    card_number = None if is_sealed else str(blueprint.get('id'))
                    collector_number, rarity = (None, None) if is_sealed else _blueprint_details(blueprint)
                    if not is_sealed:
                        # Blueprints carry no number/rarity; single-card listings do
                        # (properties_hash.collector_number / pokemon_rarity).
                        collector_number = collector_number or (str(properties.get('collector_number') or '')[:50] or None)
                        listing_rarity = properties.get('pokemon_rarity')
                        if listing_rarity:
                            rarity = str(listing_rarity)[:100]
                    seller_key, seller_country, ships_via_zero = _seller_fields(listing, is_sealed)

                    # Create raw_price entry
                    raw_price = RawPrice(
                        card_name=card_name,
                        card_set=expansion.get('name_en') or expansion.get('name'),
                        card_number=card_number,
                        collector_number=collector_number,
                        rarity=rarity,
                        condition=condition,
                        language=language,
                        price=float(price),
                        currency=currency,
                        source="CardTrader",
                        source_url=f"https://www.cardtrader.com/cards/{blueprint.get('id')}",
                        seller_name=None,  # personal data: never stored
                        seller_rating=None,
                        stock_quantity=quantity,
                        seller_key=seller_key,
                        seller_country=seller_country,
                        ships_via_zero=ships_via_zero,
                        graded=bool(listing.get('graded')),
                        scraped_at=datetime.utcnow()
                    )
                    
                    session.add(raw_price)
                    self.total_listings_scraped += 1
                    
                except Exception as e:
                    logger.warning(f"Error saving listing: {e}")
                    continue
            
            await session.commit()


async def run_cardtrader_scraper():
    """
    Entry point for CardTrader scraper
    """
    scraper = CardTraderScraperV2()
    total = await scraper.scrape_all()
    logger.info(f"CardTrader scraper finished. Total listings: {total}")
    return total


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    asyncio.run(run_cardtrader_scraper())
