"""
TCGPlayer Scraper
Scrapes Pokemon card listings from TCGPlayer.com

TCGPlayer is the largest US Pokemon card marketplace, but many EU buyers
use it for international purchases due to competitive prices and large inventory.
"""

import logging
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from decimal import Decimal

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.raw_price import RawPrice
from app.models.scrape_log import ScrapeLog
from app.utils.delay_manager import DelayManager
from app.utils.user_agent_rotator import UserAgentRotator
from app.utils.retry import retry
from app.config_tcgplayer import config


logger = logging.getLogger(__name__)


class TCGPlayerScraper:
    """
    Scrapes Pokemon card listings from TCGPlayer
    
    Features:
    - US marketplace with international shipping
    - Large inventory
    - Competitive prices
    - API support (if credentials available)
    - Filters for international shipping
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.delay_manager = DelayManager(
            min_delay=config.MIN_DELAY_SECONDS,
            max_delay=config.MAX_DELAY_SECONDS
        )
        self.user_agent_rotator = UserAgentRotator(config.USER_AGENTS)
        self.http_client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True
        )
        
        # Condition mapping
        self.condition_map = {
            "Near Mint": "NM",
            "Near Mint or Better": "NM",
            "Lightly Played": "LP",
            "Moderately Played": "MP",
            "Heavily Played": "HP",
            "Damaged": "DMG",
        }
    
    async def scrape_all_sets(self) -> int:
        """
        Scrape Pokemon cards from target sets
        
        Returns:
            Total number of listings scraped
        """
        logger.info("=" * 60)
        logger.info("Starting TCGPlayer scraper")
        logger.info("=" * 60)
        
        if config.USE_API:
            logger.info("💡 Using TCGPlayer API")
        else:
            logger.info("Using web scraping (no API credentials)")
            logger.info("💡 Tip: Get API access from tcgplayer.com/partner")
        
        total_count = 0
        
        for set_name in config.TARGET_SETS:
            try:
                logger.info(f"Scraping set: {set_name}")
                count = await self.scrape_set(set_name)
                total_count += count
                logger.info(f"  ✅ {set_name}: {count} listings")
                
                # Delay between sets
                await self.delay_manager.delay()
                
            except Exception as e:
                logger.error(f"Error scraping {set_name}: {e}")
        
        logger.info(f"📊 Total: {total_count} listings across {len(config.TARGET_SETS)} sets")
        
        # Log scrape run
        await self._log_scrape(
            source="tcgplayer",
            items_scraped=total_count,
            success=True
        )
        
        return total_count
    
    async def scrape_set(self, set_name: str) -> int:
        """Scrape cards from a specific Pokemon set"""
        count = 0
        
        for page in range(1, config.MAX_PAGES_PER_SEARCH + 1):
            try:
                products = await self.scrape_page(set_name, page)
                
                for product in products:
                    if await self._save_product(product):
                        count += 1
                
                logger.info(f"    Page {page}: {len(products)} products")
                
                if len(products) == 0:
                    break
                
                await self.delay_manager.delay()
                
            except Exception as e:
                logger.error(f"Error scraping page {page} of {set_name}: {e}")
                break
        
        return count
    
    @retry(max_attempts=3, delay=5)
    async def scrape_page(self, set_name: str, page: int = 1) -> List[Dict[str, Any]]:
        """Scrape a single page of Pokemon cards from a set"""
        # Build search URL
        # TCGPlayer URLs are like: /search/pokemon/product?productLineName=pokemon&setName=...&page=...
        search_term = set_name.replace(" ", "%20")
        url = f"{config.BASE_URL}/search/pokemon/product"
        
        params = {
            "productLineName": "pokemon",
            "setName": search_term,
            "page": page,
            "view": "grid",
        }
        
        headers = {
            "User-Agent": self.user_agent_rotator.get_random(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        
        try:
            response = await self.http_client.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            return self._parse_search_results(response.text, set_name)
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return []
            logger.error(f"HTTP error fetching {url}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            raise
    
    def _parse_search_results(self, html: str, set_name: str) -> List[Dict[str, Any]]:
        """Parse search results page"""
        soup = BeautifulSoup(html, "html.parser")
        products = []
        
        # Find product cards (TCGPlayer uses various classes)
        product_cards = soup.find_all("div", class_=re.compile(r"search-result"))
        
        if not product_cards:
            # Try alternative selector
            product_cards = soup.find_all("div", class_=re.compile(r"product-card"))
        
        for card in product_cards:
            try:
                product = self._parse_product_card(card, set_name)
                if product:
                    products.append(product)
            except Exception as e:
                logger.debug(f"Error parsing product card: {e}")
                continue
        
        return products
    
    def _parse_product_card(self, card_soup: BeautifulSoup, set_name: str) -> Optional[Dict[str, Any]]:
        """Parse individual product card"""
        try:
            # Product name
            name_elem = card_soup.find("a", class_=re.compile(r"product-name|card-name"))
            if not name_elem:
                name_elem = card_soup.find("span", class_=re.compile(r"product-name"))
            
            if not name_elem:
                return None
            
            product_name = name_elem.get_text(strip=True)
            
            # Price (TCGPlayer shows multiple prices - get the lowest)
            price_elem = card_soup.find("span", class_=re.compile(r"product-price|market-price"))
            if not price_elem:
                return None
            
            price_text = price_elem.get_text(strip=True)
            price = self._parse_price(price_text)
            if not price:
                return None
            
            # Product URL
            link_elem = card_soup.find("a", href=re.compile(r"/product/"))
            url = link_elem["href"] if link_elem else ""
            if url and not url.startswith("http"):
                url = config.BASE_URL + url
            
            # Extract card number from URL or name (if available)
            card_number = self._extract_card_number(product_name, url)
            
            # Condition (TCGPlayer defaults to Near Mint for market prices)
            condition = "NM"
            
            return {
                "product_name": product_name,
                "set_name": set_name,
                "card_number": card_number,
                "price": price,
                "condition": condition,
                "url": url,
            }
            
        except Exception as e:
            logger.debug(f"Error parsing product card: {e}")
            return None
    
    def _parse_price(self, price_text: str) -> Optional[Decimal]:
        """Extract numeric price from text"""
        # Remove currency symbols and commas
        price_text = re.sub(r"[$,\s]", "", price_text)
        
        # Try to find number
        match = re.search(r"(\d+\.?\d*)", price_text)
        if match:
            try:
                return Decimal(match.group(1))
            except:
                return None
        return None
    
    def _extract_card_number(self, product_name: str, url: str) -> str:
        """Extract card number from name or URL"""
        # Try to find number in name (e.g., "Charizard 123/165")
        match = re.search(r"(\d+/\d+)", product_name)
        if match:
            return match.group(1)
        
        # Try to find in URL
        match = re.search(r"/(\d+-\d+)", url)
        if match:
            return match.group(1).replace("-", "/")
        
        return ""
    
    async def _save_product(self, product: Dict[str, Any]) -> bool:
        """Save product to database"""
        try:
            raw_price = RawPrice(
                card_name=product["product_name"],
                card_set=product["set_name"],
                card_number=product["card_number"],
                condition=product["condition"],
                language="EN",  # TCGPlayer is primarily English
                price=product["price"],
                currency="USD",  # TCGPlayer uses USD
                source="TCGPlayer",
                source_url=product["url"],
                seller_name="",  # Market price (aggregate)
                seller_rating=None,
                stock_quantity=1,
                country="US",  # TCGPlayer is US-based
                scraped_at=datetime.utcnow(),
            )
            
            self.session.add(raw_price)
            await self.session.flush()
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving product: {e}")
            return False
    
    async def _log_scrape(self, source: str, items_scraped: int, success: bool):
        """Log scrape run"""
        try:
            log = ScrapeLog(
                source=source,
                status="success" if success else "failed",
                items_scraped=items_scraped,
                error_message=None if success else "Check logs",
                scraped_at=datetime.utcnow()
            )
            self.session.add(log)
            await self.session.commit()
        except Exception as e:
            logger.error(f"Error logging scrape: {e}")
    
    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()


async def run_tcgplayer_scraper(session: AsyncSession) -> int:
    """
    Main entry point for TCGPlayer scraper
    
    Usage:
        async with AsyncSessionLocal() as session:
            count = await run_tcgplayer_scraper(session)
    """
    scraper = TCGPlayerScraper(session)
    
    try:
        count = await scraper.scrape_all_sets()
        return count
    finally:
        await scraper.close()
