"""
CardTrader Scraper
Scrapes Pokemon card listings from CardTrader.com (2nd largest EU marketplace)

CardTrader is a major EU marketplace for Pokemon cards with standardized
conditions and good inventory across multiple countries.
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
from app.config_cardtrader import config


logger = logging.getLogger(__name__)


class CardTraderScraper:
    """
    Scrapes Pokemon card listings from CardTrader
    
    Features:
    - Supports both web scraping and API (if token available)
    - EU-focused marketplace
    - Standardized conditions
    - Multiple languages
    - Real-time inventory
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
        
        # Condition mapping (CardTrader -> our standard)
        self.condition_map = {
            "Near Mint": "NM",
            "Lightly Played": "LP",
            "Moderately Played": "MP",
            "Heavily Played": "HP",
            "Damaged": "DMG",
        }
    
    async def scrape_all_products(self) -> int:
        """
        Scrape all Pokemon products from CardTrader
        
        Returns:
            Total number of listings scraped
        """
        logger.info("=" * 60)
        logger.info("Starting CardTrader scraper")
        logger.info("=" * 60)
        
        total_count = 0
        
        if config.CARDTRADER_USE_API and config.CARDTRADER_API_TOKEN:
            # Use API (better, faster, more reliable)
            total_count = await self.scrape_via_api()
        else:
            # Use web scraping
            total_count = await self.scrape_via_web()
        
        logger.info(f"📊 Total: {total_count} listings scraped")
        
        # Log scrape run
        await self._log_scrape(
            source="cardtrader",
            items_scraped=total_count,
            success=True
        )
        
        return total_count
    
    async def scrape_via_api(self) -> int:
        """Scrape using CardTrader API (if available)"""
        logger.info("Using CardTrader API")
        
        # API requires authentication
        headers = {
            "Authorization": f"Bearer {config.CARDTRADER_API_TOKEN}",
            "User-Agent": self.user_agent_rotator.get_random()
        }
        
        count = 0
        page = 1
        
        while page <= config.MAX_PAGES_PER_SEARCH:
            try:
                # Fetch products from API
                url = f"{config.API_BASE_URL}/marketplace/products"
                params = {
                    "game_id": config.GAME_ID,  # Pokemon TCG
                    "page": page,
                    "per_page": config.ITEMS_PER_PAGE,
                }
                
                response = await self.http_client.get(url, headers=headers, params=params)
                response.raise_for_status()
                
                data = response.json()
                products = data.get("products", [])
                
                if not products:
                    break
                
                # Process each product
                for product in products:
                    if await self._save_api_product(product):
                        count += 1
                
                logger.info(f"  Page {page}: {len(products)} products")
                
                page += 1
                await self.delay_manager.delay()
                
            except Exception as e:
                logger.error(f"Error fetching API page {page}: {e}")
                break
        
        return count
    
    async def scrape_via_web(self) -> int:
        """Scrape using web scraping (fallback)"""
        logger.info("Using web scraping (no API token)")
        logger.info("💡 Tip: Get API token from cardtrader.com/account/api for better performance")
        
        count = 0
        
        # Scrape Pokemon TCG singles
        for page in range(1, config.MAX_PAGES_PER_SEARCH + 1):
            try:
                products = await self.scrape_page(page)
                
                for product in products:
                    if await self._save_web_product(product):
                        count += 1
                
                logger.info(f"  Page {page}: {len(products)} products")
                
                if len(products) == 0:
                    break
                
                await self.delay_manager.delay()
                
            except Exception as e:
                logger.error(f"Error scraping page {page}: {e}")
                break
        
        return count
    
    @retry(max_attempts=3, delay=5)
    async def scrape_page(self, page: int = 1) -> List[Dict[str, Any]]:
        """Scrape a single page of Pokemon card listings"""
        url = f"{config.BASE_URL}/en/pokemon/products"
        
        params = {
            "page": page,
        }
        
        headers = {"User-Agent": self.user_agent_rotator.get_random()}
        
        try:
            response = await self.http_client.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            return self._parse_products_page(response.text)
            
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            raise
    
    def _parse_products_page(self, html: str) -> List[Dict[str, Any]]:
        """Parse products from HTML page"""
        soup = BeautifulSoup(html, "html.parser")
        products = []
        
        # Find product cards (CardTrader uses specific classes)
        product_cards = soup.find_all("div", class_=re.compile(r"product-card"))
        
        for card in product_cards:
            try:
                product = self._parse_product_card(card)
                if product:
                    products.append(product)
            except Exception as e:
                logger.debug(f"Error parsing product card: {e}")
                continue
        
        return products
    
    def _parse_product_card(self, card_soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
        """Parse individual product card"""
        try:
            # Product name
            name_elem = card_soup.find("div", class_=re.compile(r"product-name"))
            if not name_elem:
                return None
            product_name = name_elem.get_text(strip=True)
            
            # Set name
            set_elem = card_soup.find("div", class_=re.compile(r"set-name"))
            set_name = set_elem.get_text(strip=True) if set_elem else ""
            
            # Price
            price_elem = card_soup.find("span", class_=re.compile(r"price"))
            if not price_elem:
                return None
            
            price_text = price_elem.get_text(strip=True)
            price = self._parse_price(price_text)
            if not price:
                return None
            
            # Condition
            condition_elem = card_soup.find("span", class_=re.compile(r"condition"))
            condition = condition_elem.get_text(strip=True) if condition_elem else "Near Mint"
            condition = self.condition_map.get(condition, "NM")
            
            # Language
            lang_elem = card_soup.find("span", class_=re.compile(r"language"))
            language = lang_elem.get_text(strip=True) if lang_elem else "EN"
            language = self._parse_language(language)
            
            # Seller
            seller_elem = card_soup.find("span", class_=re.compile(r"seller"))
            seller = seller_elem.get_text(strip=True) if seller_elem else ""
            
            # Quantity
            qty_elem = card_soup.find("span", class_=re.compile(r"quantity"))
            quantity = self._parse_quantity(qty_elem.get_text(strip=True)) if qty_elem else 1
            
            # Product URL
            link_elem = card_soup.find("a", class_=re.compile(r"product-link"))
            url = link_elem["href"] if link_elem else ""
            if url and not url.startswith("http"):
                url = config.BASE_URL + url
            
            return {
                "product_name": product_name,
                "set_name": set_name,
                "price": price,
                "condition": condition,
                "language": language,
                "seller": seller,
                "quantity": quantity,
                "url": url,
            }
            
        except Exception as e:
            logger.debug(f"Error parsing product card: {e}")
            return None
    
    def _parse_price(self, price_text: str) -> Optional[Decimal]:
        """Extract numeric price"""
        price_text = re.sub(r"[€$,\s]", "", price_text)
        match = re.search(r"(\d+\.?\d*)", price_text)
        if match:
            try:
                return Decimal(match.group(1))
            except:
                return None
        return None
    
    def _parse_language(self, lang_text: str) -> str:
        """Parse language code"""
        lang_map = {
            "English": "EN",
            "German": "DE",
            "French": "FR",
            "Italian": "IT",
            "Spanish": "ES",
            "Japanese": "JP",
        }
        return lang_map.get(lang_text, "EN")
    
    def _parse_quantity(self, qty_text: str) -> int:
        """Extract quantity from text"""
        match = re.search(r"(\d+)", qty_text)
        return int(match.group(1)) if match else 1
    
    async def _save_web_product(self, product: Dict[str, Any]) -> bool:
        """Save web-scraped product to database"""
        try:
            raw_price = RawPrice(
                card_name=product["product_name"],
                card_set=product["set_name"],
                card_number="",  # Not always available
                condition=product["condition"],
                language=product["language"],
                price=product["price"],
                currency="EUR",  # CardTrader uses EUR
                source="CardTrader",
                source_url=product["url"],
                seller_name=product["seller"],
                seller_rating=None,
                stock_quantity=product["quantity"],
                country="EU",
                scraped_at=datetime.utcnow(),
            )
            
            self.session.add(raw_price)
            await self.session.flush()
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving product: {e}")
            return False
    
    async def _save_api_product(self, product: Dict[str, Any]) -> bool:
        """Save API product to database"""
        try:
            # API provides more structured data
            raw_price = RawPrice(
                card_name=product.get("name", ""),
                card_set=product.get("expansion", {}).get("name", ""),
                card_number=product.get("number", ""),
                condition=self.condition_map.get(product.get("condition", "Near Mint"), "NM"),
                language=product.get("language", {}).get("code", "EN"),
                price=Decimal(str(product.get("price", 0))),
                currency="EUR",
                source="CardTrader-API",
                source_url=f"{config.BASE_URL}/products/{product.get('id', '')}",
                seller_name=product.get("seller", {}).get("username", ""),
                seller_rating=product.get("seller", {}).get("reputation", 0),
                stock_quantity=product.get("quantity", 1),
                country=product.get("seller", {}).get("country", "EU"),
                scraped_at=datetime.utcnow(),
            )
            
            self.session.add(raw_price)
            await self.session.flush()
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving API product: {e}")
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


async def run_cardtrader_scraper(session: AsyncSession) -> int:
    """
    Main entry point for CardTrader scraper
    
    Usage:
        async with AsyncSessionLocal() as session:
            count = await run_cardtrader_scraper(session)
    """
    scraper = CardTraderScraper(session)
    
    try:
        count = await scraper.scrape_all_products()
        return count
    finally:
        await scraper.close()
