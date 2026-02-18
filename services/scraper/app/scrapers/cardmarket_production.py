"""
CardMarket Pokemon Scraper - Production Version

A production-ready scraper for CardMarket.com Pokemon cards and sealed products.
Features:
- User-Agent rotation
- Randomized delays
- Rate limiting
- Graceful error handling
- Both singles and sealed products
- EU proxy support
- Append-only database writes

DO NOT use this scraper aggressively. Be respectful of CardMarket's servers.
"""

import logging
import random
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from decimal import Decimal

import httpx
from bs4 import BeautifulSoup

from app.config_cardmarket import cardmarket_config
from app.models.raw_price import RawPrice
from app.database import AsyncSessionLocal
from app.utils.user_agent_rotator import UserAgentRotator
from app.utils.delay_manager import DelayManager
from app.utils.retry import retry_with_backoff

logger = logging.getLogger(__name__)


class CardMarketProductionScraper:
    """
    Production-grade CardMarket scraper
    
    This scraper is designed to be:
    - Respectful: Rate limited, randomized delays
    - Reliable: Retry logic, error handling
    - Observable: Comprehensive logging
    - Maintainable: Clean code, well-documented
    """
    
    def __init__(self):
        self.source_name = "CardMarket"
        self.config = cardmarket_config
        self.client: Optional[httpx.AsyncClient] = None
        
        # Initialize utilities
        self.ua_rotator = UserAgentRotator(self.config.USER_AGENTS)
        self.delay_manager = DelayManager(
            min_delay=self.config.MIN_DELAY_SECONDS,
            max_delay=self.config.MAX_DELAY_SECONDS
        )
        
        logger.info(f"Initialized {self.source_name} scraper")
        logger.info(f"Rate limit: {self.config.REQUESTS_PER_MINUTE} req/min")
        logger.info(f"Delays: {self.config.MIN_DELAY_SECONDS}-{self.config.MAX_DELAY_SECONDS}s")
    
    async def setup_client(self):
        """
        Setup HTTP client with proper configuration
        """
        proxy_config = None
        if self.config.USE_PROXY and self.config.PROXY_URL:
            proxy_config = self.config.PROXY_URL
            logger.info(f"Using proxy: {proxy_config}")
        
        self.client = httpx.AsyncClient(
            proxies=proxy_config,
            timeout=self.config.TIMEOUT_SECONDS,
            follow_redirects=True,
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
        )
    
    async def cleanup_client(self):
        """
        Cleanup HTTP client
        """
        if self.client:
            await self.client.aclose()
            self.client = None
    
    @retry_with_backoff(max_retries=3, base_delay=2.0)
    async def fetch_page(self, url: str) -> str:
        """
        Fetch a page with retry logic and proper headers
        
        Args:
            url: URL to fetch
            
        Returns:
            HTML content as string
        """
        if not self.client:
            await self.setup_client()
        
        headers = self.ua_rotator.get_headers(random=True)
        
        try:
            logger.debug(f"Fetching: {url}")
            response = await self.client.get(url, headers=headers)
            response.raise_for_status()
            
            # Wait before next request (respectful scraping)
            await self.delay_manager.wait()
            
            return response.text
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP {e.response.status_code} for {url}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Request error for {url}: {e}")
            raise
    
    async def scrape(self) -> List[Dict[str, Any]]:
        """
        Main scraping method - orchestrates the entire scrape
        
        Returns:
            List of scraped product data
        """
        logger.info("=" * 70)
        logger.info(f"Starting {self.source_name} Production Scrape")
        logger.info("=" * 70)
        
        all_data = []
        
        try:
            await self.setup_client()
            
            # Scrape singles if enabled
            if self.config.SCRAPE_SINGLES:
                singles_data = await self.scrape_singles()
                all_data.extend(singles_data)
                logger.info(f"Collected {len(singles_data)} singles")
            
            # Scrape sealed products if enabled
            if self.config.SCRAPE_SEALED:
                sealed_data = await self.scrape_sealed()
                all_data.extend(sealed_data)
                logger.info(f"Collected {len(sealed_data)} sealed products")
            
            # Save to database
            if all_data:
                await self.save_to_database(all_data)
            
            logger.info("=" * 70)
            logger.info(f"Scrape completed: {len(all_data)} total items")
            logger.info("=" * 70)
            
        except Exception as e:
            logger.error(f"Scrape failed: {e}", exc_info=True)
            raise
        finally:
            await self.cleanup_client()
        
        return all_data
    
    async def scrape_singles(self) -> List[Dict[str, Any]]:
        """
        Scrape Pokemon singles (individual cards)
        
        Returns:
            List of card data dictionaries
        """
        logger.info("\n--- Scraping Pokemon Singles ---")
        all_cards = []
        
        # Use priority sets (limited to avoid overwhelming)
        sets_to_scrape = self.config.PRIORITY_SETS[:self.config.MAX_SETS_PER_RUN]
        
        for set_name in sets_to_scrape:
            logger.info(f"Processing set: {set_name}")
            
            try:
                # Build URL for singles
                # Real CardMarket URL pattern: /en/Pokemon/Products/Singles/[Set-Name]
                url = f"{self.config.POKEMON_BASE}/Products/Singles/{set_name}"
                
                # Fetch first page
                html = await self.fetch_page(url)
                
                # Parse cards from page
                cards = await self.parse_singles_page(html, set_name)
                all_cards.extend(cards)
                
                logger.info(f"  ✓ Found {len(cards)} cards in {set_name}")
                
                # Note: In production, you'd paginate through multiple pages
                # For safety, we're limiting to first page per set
                
            except Exception as e:
                logger.error(f"  ✗ Error scraping set {set_name}: {e}")
                continue
        
        return all_cards
    
    async def parse_singles_page(self, html: str, set_name: str) -> List[Dict[str, Any]]:
        """
        Parse singles (cards) from HTML page
        
        Args:
            html: Page HTML
            set_name: Name of the set
            
        Returns:
            List of card data
        """
        soup = BeautifulSoup(html, "lxml")
        cards = []
        
        try:
            # CardMarket typically uses:
            # - Table rows for product listings
            # - Divs with specific classes
            # Adjust selectors based on actual HTML structure
            
            # Try multiple selector patterns
            product_rows = (
                soup.select("div.table-body div.row") or
                soup.select("table.table tbody tr") or
                soup.select("div[class*='product-row']") or
                soup.select("div.col-md-3.col-sm-6")  # Grid layout
            )
            
            if not product_rows:
                logger.warning(f"No product rows found for {set_name}")
                return cards
            
            logger.debug(f"Found {len(product_rows)} potential products")
            
            for row in product_rows:
                try:
                    card_data = self.extract_card_data(row, set_name)
                    if card_data and self.validate_data(card_data):
                        cards.append(card_data)
                except Exception as e:
                    logger.debug(f"Error parsing row: {e}")
                    continue
        
        except Exception as e:
            logger.error(f"Error parsing singles page: {e}")
        
        return cards
    
    def extract_card_data(self, element, set_name: str) -> Optional[Dict[str, Any]]:
        """
        Extract card data from HTML element
        
        Args:
            element: BeautifulSoup element
            set_name: Pokemon set name
            
        Returns:
            Dictionary with card data or None
        """
        try:
            # Extract card name (required)
            name_elem = (
                element.select_one("div.card-name a") or
                element.select_one("a.product-name") or
                element.select_one("h4 a") or
                element.select_one("a[href*='/Single/']")
            )
            
            if not name_elem:
                return None
            
            card_name = name_elem.get_text(strip=True)
            if not card_name or len(card_name) < 2:
                return None
            
            # Extract product ID from URL
            product_id = None
            href = name_elem.get('href', '')
            if href:
                # CardMarket URLs like: /Products/Singles/Set-Name/Card-Name-123456
                match = re.search(r'/(\d+)$', href)
                if match:
                    product_id = match.group(1)
            
            # Extract card number
            number_elem = element.select_one("span.card-number, .icon-info")
            card_number = None
            if number_elem:
                number_text = number_elem.get_text(strip=True)
                # Extract number from text like "#123/456" or "123"
                match = re.search(r'#?(\d+)', number_text)
                if match:
                    card_number = match.group(1)
            
            # Extract price (required)
            price_elem = (
                element.select_one("span.price-label") or
                element.select_one("dd.price") or
                element.select_one("span[class*='price']")
            )
            
            price = None
            if price_elem:
                price_text = price_elem.get_text(strip=True)
                price = self.parse_price(price_text)
            
            # If no price, skip (not available for sale)
            if not price:
                return None
            
            # Extract condition
            condition_elem = element.select_one("span.icon-condition, .condition")
            condition = "Near Mint"  # Default
            if condition_elem:
                condition_text = condition_elem.get_text(strip=True)
                condition = self.normalize_condition(condition_text)
            
            # Extract language
            language_elem = element.select_one("span.icon-language, img.language-flag")
            language = "EN"  # Default
            if language_elem:
                if language_elem.name == 'img':
                    lang_text = language_elem.get('alt', 'EN')
                else:
                    lang_text = language_elem.get_text(strip=True)
                language = self.parse_language(lang_text)
            
            # Extract availability/listing count
            availability_elem = element.select_one("span.amount-available, .article-count")
            listing_count = None
            if availability_elem:
                avail_text = availability_elem.get_text(strip=True)
                match = re.search(r'(\d+)', avail_text)
                if match:
                    listing_count = int(match.group(1))
            
            # Extract seller info (for cheapest listing)
            seller_elem = element.select_one("span.seller-name, a.seller-link")
            seller_name = None
            if seller_elem:
                seller_name = seller_elem.get_text(strip=True)
            
            # Build product URL
            product_url = None
            if href:
                product_url = href if href.startswith('http') else f"{self.config.BASE_URL}{href}"
            
            return {
                "product_name": card_name,
                "product_id": product_id,
                "card_number": card_number,
                "set_name": set_name,
                "category": "single",
                "price": price,
                "currency": "EUR",
                "condition": condition,
                "language": language,
                "country": "EU",  # CardMarket is EU-wide
                "availability": listing_count,
                "seller_name": seller_name,
                "source_url": product_url,
                "scraped_at": datetime.utcnow(),
            }
            
        except Exception as e:
            logger.debug(f"Error extracting card data: {e}")
            return None
    
    async def scrape_sealed(self) -> List[Dict[str, Any]]:
        """
        Scrape Pokemon sealed products (booster boxes, ETBs, etc.)
        
        Returns:
            List of sealed product data
        """
        logger.info("\n--- Scraping Pokemon Sealed Products ---")
        all_products = []
        
        try:
            # CardMarket sealed products URL
            # Real URL: /en/Pokemon/Products/Sealed-Products
            url = f"{self.config.POKEMON_BASE}/Products/Sealed-Products"
            
            html = await self.fetch_page(url)
            products = await self.parse_sealed_page(html)
            all_products.extend(products)
            
            logger.info(f"  ✓ Found {len(products)} sealed products")
            
        except Exception as e:
            logger.error(f"  ✗ Error scraping sealed products: {e}")
        
        return all_products
    
    async def parse_sealed_page(self, html: str) -> List[Dict[str, Any]]:
        """
        Parse sealed products from HTML
        
        Args:
            html: Page HTML
            
        Returns:
            List of product data
        """
        soup = BeautifulSoup(html, "lxml")
        products = []
        
        try:
            # Similar structure to singles
            product_rows = (
                soup.select("div.table-body div.row") or
                soup.select("table.table tbody tr") or
                soup.select("div[class*='product-row']")
            )
            
            if not product_rows:
                logger.warning("No sealed products found")
                return products
            
            for row in product_rows:
                try:
                    product_data = self.extract_sealed_data(row)
                    if product_data and self.validate_data(product_data):
                        products.append(product_data)
                except Exception as e:
                    logger.debug(f"Error parsing sealed product: {e}")
                    continue
        
        except Exception as e:
            logger.error(f"Error parsing sealed page: {e}")
        
        return products
    
    def extract_sealed_data(self, element) -> Optional[Dict[str, Any]]:
        """
        Extract sealed product data from HTML element
        
        Args:
            element: BeautifulSoup element
            
        Returns:
            Dictionary with product data or None
        """
        try:
            # Extract product name
            name_elem = (
                element.select_one("div.product-name a") or
                element.select_one("a.product-name") or
                element.select_one("h4 a")
            )
            
            if not name_elem:
                return None
            
            product_name = name_elem.get_text(strip=True)
            if not product_name:
                return None
            
            # Extract product ID
            product_id = None
            href = name_elem.get('href', '')
            if href:
                match = re.search(r'/(\d+)$', href)
                if match:
                    product_id = match.group(1)
            
            # Determine set from product name
            set_name = self.extract_set_from_name(product_name)
            
            # Extract price
            price_elem = element.select_one("span.price-label, dd.price")
            price = None
            if price_elem:
                price = self.parse_price(price_elem.get_text(strip=True))
            
            if not price:
                return None
            
            # Extract language
            language_elem = element.select_one("span.icon-language, img.language-flag")
            language = "EN"
            if language_elem:
                if language_elem.name == 'img':
                    language = self.parse_language(language_elem.get('alt', 'EN'))
                else:
                    language = self.parse_language(language_elem.get_text(strip=True))
            
            # Extract availability
            availability_elem = element.select_one("span.amount-available")
            listing_count = None
            if availability_elem:
                match = re.search(r'(\d+)', availability_elem.get_text(strip=True))
                if match:
                    listing_count = int(match.group(1))
            
            # Build URL
            product_url = None
            if href:
                product_url = href if href.startswith('http') else f"{self.config.BASE_URL}{href}"
            
            return {
                "product_name": product_name,
                "product_id": product_id,
                "card_number": None,  # Not applicable for sealed
                "set_name": set_name,
                "category": "sealed",
                "price": price,
                "currency": "EUR",
                "condition": "Sealed",  # Always sealed
                "language": language,
                "country": "EU",
                "availability": listing_count,
                "seller_name": None,
                "source_url": product_url,
                "scraped_at": datetime.utcnow(),
            }
            
        except Exception as e:
            logger.debug(f"Error extracting sealed product: {e}")
            return None
    
    def parse_price(self, price_text: str) -> Optional[float]:
        """
        Parse price from text
        
        Args:
            price_text: Price string like "€12.99" or "12,99 €"
            
        Returns:
            Float price or None
        """
        try:
            # Remove currency symbols and whitespace
            cleaned = re.sub(r'[€$£\s]', '', price_text)
            # Replace comma with dot (European format)
            cleaned = cleaned.replace(',', '.')
            # Extract first number
            match = re.search(r'(\d+\.?\d*)', cleaned)
            if match:
                price = float(match.group(1))
                # Validate price range
                if self.config.MIN_PRICE <= price <= self.config.MAX_PRICE:
                    return price
        except Exception as e:
            logger.debug(f"Error parsing price '{price_text}': {e}")
        return None
    
    def normalize_condition(self, condition_text: str) -> str:
        """
        Normalize condition string
        
        Args:
            condition_text: Raw condition text
            
        Returns:
            Normalized condition
        """
        condition_map = {
            "mt": "Mint",
            "mint": "Mint",
            "nm": "Near Mint",
            "near mint": "Near Mint",
            "ex": "Excellent",
            "excellent": "Excellent",
            "gd": "Good",
            "good": "Good",
            "lp": "Light Play",
            "light play": "Light Play",
            "pl": "Played",
            "played": "Played",
            "po": "Poor",
            "poor": "Poor",
        }
        
        normalized = condition_text.lower().strip()
        return condition_map.get(normalized, condition_text)
    
    def parse_language(self, lang_text: str) -> str:
        """
        Parse language code
        
        Args:
            lang_text: Language text or code
            
        Returns:
            2-letter language code
        """
        lang_map = {
            "english": "EN",
            "german": "DE",
            "deutsch": "DE",
            "french": "FR",
            "français": "FR",
            "italian": "IT",
            "italiano": "IT",
            "spanish": "ES",
            "español": "ES",
            "portuguese": "PT",
            "português": "PT",
            "dutch": "NL",
            "nederlands": "NL",
            "polish": "PL",
            "polski": "PL",
        }
        
        normalized = lang_text.lower().strip()
        for key, value in lang_map.items():
            if key in normalized:
                return value
        
        # If already 2-letter code
        if len(normalized) == 2:
            return normalized.upper()
        
        return "EN"  # Default
    
    def extract_set_from_name(self, product_name: str) -> str:
        """
        Extract Pokemon set from product name
        
        Args:
            product_name: Full product name
            
        Returns:
            Set name
        """
        # Common patterns in sealed product names
        set_patterns = [
            r'Base Set',
            r'Scarlet[^V]*Violet[^1]*151',
            r'Paldean Fates',
            r'Obsidian Flames',
            r'Paradox Rift',
            r'Temporal Forces',
        ]
        
        for pattern in set_patterns:
            if re.search(pattern, product_name, re.IGNORECASE):
                match = re.search(pattern, product_name, re.IGNORECASE)
                return match.group(0)
        
        return "Unknown Set"
    
    def validate_data(self, data: Dict[str, Any]) -> bool:
        """
        Validate scraped data before saving
        
        Args:
            data: Product data dictionary
            
        Returns:
            True if valid, False otherwise
        """
        # Required fields
        if not data.get('product_name'):
            logger.debug("Missing product_name")
            return False
        
        if not data.get('price') or data['price'] <= 0:
            logger.debug("Invalid price")
            return False
        
        if not data.get('set_name'):
            logger.debug("Missing set_name")
            return False
        
        if data.get('category') not in ['single', 'sealed']:
            logger.debug("Invalid category")
            return False
        
        return True
    
    async def save_to_database(self, data: List[Dict[str, Any]]):
        """
        Save scraped data to database (append-only)
        
        Args:
            data: List of product data dictionaries
        """
        if not data:
            logger.info("No data to save")
            return
        
        logger.info(f"Saving {len(data)} items to database...")
        
        async with AsyncSessionLocal() as session:
            try:
                # Map to RawPrice model
                records = []
                for item in data:
                    record = RawPrice(
                        card_name=item['product_name'],
                        card_set=item['set_name'],
                        card_number=item.get('card_number'),
                        condition=item.get('condition', 'Unknown'),
                        language=item.get('language', 'EN'),
                        price=Decimal(str(item['price'])),
                        currency=item.get('currency', 'EUR'),
                        source=self.source_name,
                        source_url=item.get('source_url'),
                        seller_name=item.get('seller_name'),
                        seller_rating=None,
                        stock_quantity=item.get('availability'),
                        scraped_at=item['scraped_at'],
                    )
                    records.append(record)
                
                # Bulk insert (append-only, no updates)
                session.add_all(records)
                await session.commit()
                
                logger.info(f"✅ Successfully saved {len(records)} records")
                
            except Exception as e:
                await session.rollback()
                logger.error(f"❌ Database error: {e}", exc_info=True)
                raise


# Main execution function for cron/script
async def run_cardmarket_scraper():
    """
    Entry point for running the CardMarket scraper
    Can be called from cron or command line
    """
    scraper = CardMarketProductionScraper()
    try:
        await scraper.scrape()
        return 0  # Success
    except Exception as e:
        logger.error(f"Scraper failed: {e}")
        return 1  # Failure
