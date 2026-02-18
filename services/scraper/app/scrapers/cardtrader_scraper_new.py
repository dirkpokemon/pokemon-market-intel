"""
CardTrader Scraper - WORKING VERSION
Scrapes Pokemon card listings from CardTrader.com via API

API Structure:
1. GET /api/v2/expansions (all Pokemon expansions)
2. GET /api/v2/blueprints?expansion_id={id} (cards in expansion)
3. GET /api/v2/marketplace/products?blueprint_id={id} (actual listings with prices)
"""

import logging
import asyncio
from datetime import datetime
from typing import List, Dict, Any
from decimal import Decimal

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.raw_price import RawPrice
from app.models.scrape_log import ScrapeLog
from app.config_cardtrader import config
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


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
        self.total_blueprints_processed = 0
    
    async def scrape_all(self) -> int:
        """
        Main scraper entry point
        
        Returns:
            Total number of listings scraped
        """
        logger.info("=" * 60)
        logger.info("Starting CardTrader API Scraper")
        logger.info("=" * 60)
        
        start_time = datetime.utcnow()
        
        try:
            # Step 1: Get Pokemon expansions
            expansions = await self._fetch_pokemon_expansions()
            logger.info(f"Found {len(expansions)} Pokemon expansions")
            
            # Focus on recent/popular expansions (last 100 expansions = most recent sets)
            # CardTrader has 3000+ expansions total, but most are old/inactive
            recent_expansions = expansions[:100]  # Get most recent 100
            logger.info(f"Processing {len(recent_expansions)} recent expansions for optimal data coverage")
            
            # Step 2: For each expansion, get blueprints and marketplace listings
            for i, expansion in enumerate(recent_expansions, 1):
                expansion_id = expansion['id']
                expansion_name = expansion['name']
                
                logger.info(f"[{i}/{len(recent_expansions)}] Processing: {expansion_name}")
                
                # Get blueprints for this expansion
                blueprints = await self._fetch_blueprints(expansion_id)
                logger.info(f"  Found {len(blueprints)} blueprints")
                
                # Process all blueprints (no limit)
                for blueprint in blueprints:
                    blueprint_id = blueprint['id']
                    blueprint_name = blueprint.get('name', 'Unknown')
                    
                    listings = await self._fetch_marketplace_listings(blueprint_id)
                    
                    if listings:
                        await self._save_listings(listings, blueprint, expansion)
                        self.total_blueprints_processed += 1
                        
                        # Log progress every 10 blueprints
                        if self.total_blueprints_processed % 10 == 0:
                            logger.info(f"    Progress: {self.total_blueprints_processed} blueprints, {self.total_listings_scraped} listings")
                    
                    # Smaller delay for faster scraping (be respectful but efficient)
                    await asyncio.sleep(0.3)
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            logger.info("=" * 60)
            logger.info(f"✅ Scrape complete!")
            logger.info(f"   Blueprints processed: {self.total_blueprints_processed}")
            logger.info(f"   Listings scraped: {self.total_listings_scraped}")
            logger.info(f"   Duration: {duration:.1f}s")
            logger.info("=" * 60)
            
            # Log to database
            async with AsyncSessionLocal() as session:
                scrape_log = ScrapeLog(
                    source="CardTrader",
                    started_at=start_time,
                    completed_at=end_time,
                    duration_seconds=int(duration),
                    items_scraped=self.total_listings_scraped,
                    status="success" if self.total_listings_scraped > 0 else "no_data"
                )
                session.add(scrape_log)
                await session.commit()
            
            return self.total_listings_scraped
            
        except Exception as e:
            logger.error(f"Scraper failed: {e}", exc_info=True)
            return 0
    
    async def _fetch_pokemon_expansions(self) -> List[Dict[str, Any]]:
        """
        Fetch all Pokemon expansions (game_id=5)
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/expansions",
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            
            all_expansions = response.json()
            
            # Filter for Pokemon (game_id=5)
            pokemon_expansions = [
                exp for exp in all_expansions
                if exp.get('game_id') == 5
            ]
            
            return pokemon_expansions
    
    async def _fetch_blueprints(self, expansion_id: int) -> List[Dict[str, Any]]:
        """
        Fetch all blueprints (cards) for a given expansion
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/blueprints",
                params={"expansion_id": expansion_id},
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def _fetch_marketplace_listings(self, blueprint_id: int) -> List[Dict[str, Any]]:
        """
        Fetch marketplace listings for a given blueprint
        
        Response format:
        {
            "blueprint_id": [
                {
                    "id": listing_id,
                    "price_cents": 499,
                    "price_currency": "EUR",
                    "quantity": 10,
                    ...
                }
            ]
        }
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/marketplace/products",
                params={"blueprint_id": blueprint_id},
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Response is a dict with blueprint_id as key
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
                    
                    # Create raw_price entry
                    raw_price = RawPrice(
                        card_name=card_name,
                        card_set=expansion.get('name_en') or expansion.get('name'),
                        card_number=str(blueprint.get('id')),  # Use blueprint_id as card number
                        condition=condition,
                        language=language,
                        price=float(price),
                        currency=currency,
                        source="CardTrader",
                        source_url=f"https://www.cardtrader.com/cards/{blueprint.get('id')}",
                        seller_name=None,  # Not available in API response
                        seller_rating=None,
                        stock_quantity=quantity,
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
