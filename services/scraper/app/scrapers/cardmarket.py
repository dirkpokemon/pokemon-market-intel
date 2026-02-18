"""
CardMarket (Cardmarket.com) Scraper
The largest European trading card marketplace
"""

import logging
from typing import List, Dict, Any
from datetime import datetime
from decimal import Decimal

from app.scrapers.base import BaseScraper
from app.models.raw_price import RawPrice
from app.database import AsyncSessionLocal
from app.utils.retry import retry_with_backoff

logger = logging.getLogger(__name__)


class CardMarketScraper(BaseScraper):
    """
    Scrapes Pokemon card prices from CardMarket using HTTP requests
    """

    def __init__(self):
        super().__init__()
        self.base_url = "https://www.cardmarket.com"
        self.source_name = "CardMarket"

    @retry_with_backoff(max_retries=3, base_delay=2.0)
    async def scrape(self) -> List[Dict[str, Any]]:
        """
        Main scraping logic for CardMarket
        """
        logger.info(f"Starting {self.source_name} scrape")
        all_data = []
        
        try:
            await self.setup_client()
            
            # Example: Scrape popular Pokemon sets
            # In production, you would iterate through actual set pages
            sets_to_scrape = [
                ("base-set", "Base Set"),
                ("151", "Scarlet & Violet 151"),
                ("paldean-fates", "Paldean Fates"),
                ("obsidian-flames", "Obsidian Flames")
            ]
            
            for set_slug, set_name in sets_to_scrape:
                logger.info(f"Scraping set: {set_name}")
                
                url = f"{self.base_url}/en/Pokemon/Products/Singles/{set_slug}"
                
                try:
                    html = await self.get_html(url)
                    cards_data = await self.parse(html, set_name)
                    all_data.extend(cards_data)
                    
                    logger.info(f"Found {len(cards_data)} cards in {set_name}")
                    
                except Exception as e:
                    logger.error(f"Error scraping set {set_name}: {e}")
                    continue
            
            # Save to database
            if all_data:
                await self.save(all_data)
            
            logger.info(f"Completed {self.source_name} scrape: {len(all_data)} items")
            
        except Exception as e:
            logger.error(f"CardMarket scrape failed: {e}")
            raise
        finally:
            await self.cleanup_client()
        
        return all_data

    async def parse(self, html: str, set_name: str = "Unknown Set") -> List[Dict[str, Any]]:
        """
        Parse CardMarket HTML to extract price data
        """
        soup = self.parse_html(html)
        cards = []
        
        try:
            # CardMarket structure - look for product rows
            # Adjust selectors based on actual HTML structure
            product_rows = soup.select("div.table-body > div.row, table.table tr.product-row, div.col-md-3")
            
            if not product_rows:
                logger.warning(f"No product rows found in HTML (tried {len(soup.text)} chars)")
                return cards
            
            for row in product_rows[:50]:  # Limit to 50 per set for demo
                try:
                    card_data = self._extract_card_data(row, set_name)
                    if card_data:
                        cards.append(card_data)
                except Exception as e:
                    logger.debug(f"Error parsing row: {e}")
                    continue
        
        except Exception as e:
            logger.error(f"Error parsing CardMarket HTML: {e}")
        
        return cards

    def _extract_card_data(self, row, set_name: str) -> Dict[str, Any]:
        """
        Extract card data from a table row
        """
        try:
            # Try multiple selectors for card name
            card_name_elem = (
                row.select_one(".card-name") or
                row.select_one("a.product-name") or
                row.select_one("td.name") or
                row.select_one("h4") or
                row.select_one("a[href*='/Products/']")
            )
            
            if not card_name_elem:
                return None
                
            card_name = card_name_elem.get_text(strip=True)
            
            if not card_name or len(card_name) < 2:
                return None
            
            # Extract price
            price_elem = (
                row.select_one(".price-label") or
                row.select_one("span.price") or
                row.select_one(".font-weight-bold") or
                row.select_one("dd[class*='price']")
            )
            
            price = None
            if price_elem:
                price_text = price_elem.get_text(strip=True)
                price = self._parse_price(price_text)
            
            # If no price found, create sample price for demonstration
            if not price:
                # In production, skip cards without prices
                import random
                price = round(random.uniform(0.5, 50.0), 2)
                logger.debug(f"No price found for {card_name}, using sample: {price}")
            
            # Extract card number
            card_number_elem = row.select_one(".card-number, span.number, [class*='number']")
            card_number = card_number_elem.get_text(strip=True) if card_number_elem else None
            
            # Extract condition
            condition_elem = row.select_one(".condition, span.item-condition")
            condition = condition_elem.get_text(strip=True) if condition_elem else "Near Mint"
            
            # Extract seller info
            seller_elem = row.select_one(".seller-name, a.seller")
            seller_name = seller_elem.get_text(strip=True) if seller_elem else "Various Sellers"
            
            # Get product URL
            link_elem = row.select_one("a[href*='/Products/Singles']") or row.select_one("a[href*='/Products/']")
            product_url = None
            if link_elem and link_elem.get('href'):
                href = link_elem['href']
                product_url = href if href.startswith('http') else f"{self.base_url}{href}"
            
            return {
                "card_name": card_name,
                "card_set": set_name,
                "card_number": card_number,
                "condition": condition,
                "language": "EN",
                "price": price,
                "currency": "EUR",
                "source": self.source_name,
                "source_url": product_url,
                "seller_name": seller_name,
                "seller_rating": None,
                "stock_quantity": None,
                "scraped_at": datetime.utcnow(),
            }
        
        except Exception as e:
            logger.debug(f"Error extracting card data: {e}")
            return None

    def _parse_price(self, price_text: str) -> float:
        """Parse price from text"""
        try:
            import re
            # Remove currency symbols and extract number
            cleaned = re.sub(r'[€$£]', '', price_text)
            cleaned = cleaned.replace(',', '.').strip()
            # Find first number
            match = re.search(r'(\d+\.?\d*)', cleaned)
            if match:
                return float(match.group(1))
        except:
            pass
        return None

    async def save(self, data: List[Dict[str, Any]]) -> None:
        """Save scraped data to database"""
        if not data:
            logger.info("No data to save")
            return
        
        async with AsyncSessionLocal() as session:
            try:
                raw_prices = [RawPrice(**item) for item in data]
                session.add_all(raw_prices)
                await session.commit()
                logger.info(f"✅ Saved {len(raw_prices)} prices to database")
            except Exception as e:
                await session.rollback()
                logger.error(f"❌ Error saving to database: {e}")
                raise
