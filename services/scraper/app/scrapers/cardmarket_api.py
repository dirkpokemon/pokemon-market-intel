"""
CardMarket MKM API Scraper
Fetches Pokemon card price guides via the official CardMarket API v2.0
using OAuth 1.0a (implemented manually with hmac + hashlib — no library needed).
"""

import asyncio
import base64
import hashlib
import hmac
import logging
import os
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import quote

import httpx

from app.database import AsyncSessionLocal
from app.models.raw_price import RawPrice

logger = logging.getLogger(__name__)

# MKM API base URL
MKM_API_BASE = "https://api.cardmarket.com/ws/v2.0/output.json"

# English expansion name fragments — same strategy as cardtrader_scraper_new.py
ENGLISH_EXPANSIONS_KEYWORDS = [
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

# Maximum expansions to process per run (budget guard for MKM free tier)
MAX_EXPANSIONS_PER_RUN = 50

# Batch size for database inserts
DB_BATCH_SIZE = 500

# Delay between API requests (seconds) — MKM free tier: 5000 req/day
REQUEST_DELAY = 0.5


def _pct_encode(value: str) -> str:
    """RFC 3986 percent-encoding (quote everything except unreserved chars)."""
    return quote(str(value), safe="")


def _build_oauth_header(
    method: str,
    url: str,
    app_token: str,
    app_secret: str,
    access_token: str,
    access_token_secret: str,
) -> str:
    """
    Build an OAuth 1.0a Authorization header for the MKM API.

    Signing key:  url_encode(APP_SECRET) & url_encode(ACCESS_TOKEN_SECRET)
    Base string:  METHOD & url_encode(base_url) & url_encode(sorted_params_string)
    """
    timestamp = str(int(time.time()))
    nonce = uuid.uuid4().hex

    # OAuth parameters (no oauth_signature yet)
    oauth_params: Dict[str, str] = {
        "oauth_consumer_key": app_token,
        "oauth_token": access_token,
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": timestamp,
        "oauth_nonce": nonce,
        "oauth_version": "1.0",
    }

    # Sort params alphabetically and join as key=value pairs
    sorted_params = "&".join(
        f"{_pct_encode(k)}={_pct_encode(v)}"
        for k, v in sorted(oauth_params.items())
    )

    # Signature base string
    base_string = "&".join([
        method.upper(),
        _pct_encode(url),
        _pct_encode(sorted_params),
    ])

    # Signing key
    signing_key = f"{_pct_encode(app_secret)}&{_pct_encode(access_token_secret)}"

    # HMAC-SHA1 signature
    signature = hmac.new(
        signing_key.encode("ascii"),
        base_string.encode("ascii"),
        hashlib.sha1,
    ).digest()

    signature_b64 = base64.b64encode(signature).decode("ascii")

    # Build Authorization header
    oauth_params["oauth_signature"] = signature_b64
    header_parts = [f'realm="{url}"'] + [
        f'{k}="{v}"' for k, v in sorted(oauth_params.items())
    ]
    return "OAuth " + ",".join(header_parts)


def _is_target_expansion(name: str) -> bool:
    """Return True if the expansion name matches one of the known English set phrases."""
    lower = name.lower()
    return any(phrase.lower() in lower for phrase in ENGLISH_EXPANSIONS_KEYWORDS)


class CardMarketAPIClient:
    """
    Fetches Pokemon card price guides from the CardMarket MKM API v2.0.

    Credentials are read from environment variables:
        CARDMARKET_APP_TOKEN
        CARDMARKET_APP_SECRET
        CARDMARKET_ACCESS_TOKEN
        CARDMARKET_ACCESS_TOKEN_SECRET

    If any credential is missing the scraper logs a warning and returns 0
    (graceful skip — does not raise).
    """

    def __init__(self) -> None:
        self.app_token = os.environ.get("CARDMARKET_APP_TOKEN", "")
        self.app_secret = os.environ.get("CARDMARKET_APP_SECRET", "")
        self.access_token = os.environ.get("CARDMARKET_ACCESS_TOKEN", "")
        self.access_token_secret = os.environ.get("CARDMARKET_ACCESS_TOKEN_SECRET", "")

    def _has_credentials(self) -> bool:
        return all([
            self.app_token,
            self.app_secret,
            self.access_token,
            self.access_token_secret,
        ])

    def _auth_header(self, method: str, url: str) -> str:
        return _build_oauth_header(
            method=method,
            url=url,
            app_token=self.app_token,
            app_secret=self.app_secret,
            access_token=self.access_token,
            access_token_secret=self.access_token_secret,
        )

    async def _get(self, client: httpx.AsyncClient, path: str) -> Any:
        """Perform an authenticated GET request against the MKM API."""
        url = f"{MKM_API_BASE}{path}"
        auth_header = self._auth_header("GET", url)
        response = await client.get(
            url,
            headers={"Authorization": auth_header},
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()

    async def _fetch_pokemon_expansions(self, client: httpx.AsyncClient) -> List[Dict[str, Any]]:
        """
        GET /expansions/pokemon — returns all Pokemon expansions.
        MKM filters by idGame automatically when using this endpoint.
        """
        data = await self._get(client, "/expansions/pokemon")
        # Response shape: {"expansion": [...]} or a list directly
        if isinstance(data, dict):
            return data.get("expansion", data.get("expansions", []))
        return data if isinstance(data, list) else []

    async def _fetch_singles(
        self, client: httpx.AsyncClient, expansion_id: int
    ) -> List[Dict[str, Any]]:
        """GET /expansions/{idExpansion}/singles — returns all singles with priceGuide."""
        data = await self._get(client, f"/expansions/{expansion_id}/singles")
        if isinstance(data, dict):
            return data.get("single", data.get("singles", []))
        return data if isinstance(data, list) else []

    async def scrape_all(self) -> int:
        """
        Fetch price guides for all matching Pokemon expansions and persist them.

        Returns:
            Number of RawPrice rows saved.
        """
        if not self._has_credentials():
            logger.warning(
                "CardMarket API credentials not set "
                "(CARDMARKET_APP_TOKEN / APP_SECRET / ACCESS_TOKEN / ACCESS_TOKEN_SECRET). "
                "Skipping CardMarket scrape."
            )
            return 0

        logger.info("=" * 60)
        logger.info("Starting CardMarket API scraper")
        logger.info("=" * 60)

        start_time = datetime.utcnow()
        total_saved = 0

        try:
            async with httpx.AsyncClient() as client:
                # Step 1: fetch all Pokemon expansions
                expansions = await self._fetch_pokemon_expansions(client)
                logger.info(f"CardMarket: fetched {len(expansions)} total Pokemon expansions")

                # Step 2: filter to English target sets
                target = [
                    e for e in expansions
                    if _is_target_expansion(e.get("enName", e.get("name", "")))
                ]
                logger.info(
                    f"CardMarket: {len(target)} expansions match English set filter; "
                    f"capping at {MAX_EXPANSIONS_PER_RUN}"
                )
                target = target[:MAX_EXPANSIONS_PER_RUN]

                # Step 3: for each expansion fetch singles and save price guides
                batch: List[RawPrice] = []
                for idx, expansion in enumerate(target, 1):
                    expansion_id: int = expansion.get("idExpansion") or expansion.get("id")
                    expansion_name: str = (
                        expansion.get("enName") or expansion.get("name", "Unknown")
                    )
                    logger.info(
                        f"[{idx}/{len(target)}] CardMarket: fetching singles for '{expansion_name}'"
                    )

                    try:
                        singles = await self._fetch_singles(client, expansion_id)
                    except Exception as exc:
                        logger.warning(
                            f"CardMarket: failed to fetch singles for expansion "
                            f"{expansion_id} ({expansion_name}): {exc}"
                        )
                        await asyncio.sleep(REQUEST_DELAY)
                        continue

                    for card in singles:
                        price_guide: Optional[Dict[str, Any]] = card.get("priceGuide")
                        if not price_guide:
                            continue

                        low_price = price_guide.get("LOW")
                        if low_price is None:
                            continue

                        try:
                            price_float = float(low_price)
                        except (TypeError, ValueError):
                            continue

                        card_name: str = (
                            card.get("enName") or card.get("name", "Unknown")
                        )
                        card_number: Optional[str] = (
                            str(card.get("number")) if card.get("number") is not None else None
                        )

                        batch.append(RawPrice(
                            card_name=card_name,
                            card_set=expansion_name,
                            card_number=card_number,
                            condition="NM",
                            language="EN",
                            price=price_float,
                            currency="EUR",
                            source="CardMarket",
                            source_url=None,
                            seller_name=None,
                            seller_rating=None,
                            stock_quantity=None,
                            scraped_at=datetime.utcnow(),
                        ))

                        # Flush batch when it reaches the target size
                        if len(batch) >= DB_BATCH_SIZE:
                            saved = await self._flush_batch(batch)
                            total_saved += saved
                            batch = []

                    await asyncio.sleep(REQUEST_DELAY)

                # Flush remaining rows
                if batch:
                    saved = await self._flush_batch(batch)
                    total_saved += saved

        except Exception as exc:
            logger.error(f"CardMarket scraper encountered an error: {exc}", exc_info=True)
            return total_saved

        duration = (datetime.utcnow() - start_time).total_seconds()
        logger.info("=" * 60)
        logger.info(f"CardMarket scrape complete: {total_saved} prices saved in {duration:.1f}s")
        logger.info("=" * 60)
        return total_saved

    async def _flush_batch(self, batch: List[RawPrice]) -> int:
        """Persist a batch of RawPrice rows and return the count saved."""
        if not batch:
            return 0
        try:
            async with AsyncSessionLocal() as session:
                session.add_all(batch)
                await session.commit()
            logger.debug(f"CardMarket: flushed {len(batch)} rows to DB")
            return len(batch)
        except Exception as exc:
            logger.error(f"CardMarket: DB flush failed: {exc}", exc_info=True)
            return 0
