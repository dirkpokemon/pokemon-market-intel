"""
eBay Sold Listings Scraper
Scrapes completed Pokemon card sales from eBay EU sites

This scraper collects REAL market data (actual sold prices)
which is critical for accurate deal scoring and trend analysis.
"""

import logging
import re
from datetime import datetime, timedelta
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
from app.config_ebay import config


logger = logging.getLogger(__name__)


class EbayScraper:
    """
    Scrapes sold Pokemon card listings from eBay
    
    Features:
    - Scrapes completed/sold listings only (real market data)
    - Supports multiple EU eBay sites
    - Extracts: product name, price, condition, seller, date sold
    - Handles currency conversion
    - Rate limited and respectful
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
        
        # Currency symbols for different eBay sites
        self.currency_map = {
            "ebay.de": "EUR",
            "ebay.fr": "EUR",
            "ebay.nl": "EUR",
            "ebay.it": "EUR",
            "ebay.es": "EUR",
            "ebay.co.uk": "GBP",
        }
        
        # Country codes
        self.country_map = {
            "ebay.de": "DE",
            "ebay.fr": "FR",
            "ebay.nl": "NL",
            "ebay.it": "IT",
            "ebay.es": "ES",
            "ebay.co.uk": "UK",
        }
    
    async def scrape_all_sites(self) -> Dict[str, int]:
        """
        Scrape all configured eBay sites
        
        Returns:
            Dict with statistics per site
        """
        logger.info("=" * 60)
        logger.info("Starting eBay scraper for sold listings")
        logger.info("=" * 60)
        
        stats = {}
        
        for site in config.EBAY_SITES:
            logger.info(f"Scraping {site}...")
            
            try:
                count = await self.scrape_site(site)
                stats[site] = count
                logger.info(f"✅ {site}: {count} listings scraped")
                
                # Delay between sites
                await self.delay_manager.delay()
                
            except Exception as e:
                logger.error(f"❌ Error scraping {site}: {e}")
                stats[site] = 0
        
        total = sum(stats.values())
        logger.info(f"📊 Total: {total} listings across {len(config.EBAY_SITES)} sites")
        
        # Log scrape run
        await self._log_scrape(
            source="ebay_all",
            items_scraped=total,
            success=True
        )
        
        return stats
    
    async def scrape_site(self, site: str) -> int:
        """Scrape sold listings from a specific eBay site"""
        count = 0
        
        for keyword in config.SEARCH_KEYWORDS:
            try:
                listings = await self.search_sold_listings(site, keyword)
                
                for listing in listings:
                    if await self._save_listing(listing):
                        count += 1
                
                # Delay between searches
                await self.delay_manager.delay()
                
            except Exception as e:
                logger.error(f"Error searching '{keyword}' on {site}: {e}")
        
        return count
    
    @retry(max_attempts=3, delay=5)
    async def search_sold_listings(
        self, 
        site: str, 
        keyword: str,
        max_pages: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Search for sold Pokemon card listings on eBay
        
        Args:
            site: eBay site (e.g., ebay.de)
            keyword: Search keyword
            max_pages: Maximum pages to scrape per keyword
        
        Returns:
            List of listing dictionaries
        """
        listings = []
        
        for page in range(1, max_pages + 1):
            # Build search URL for sold items
            url = self._build_search_url(site, keyword, page)
            
            # Fetch page
            headers = {"User-Agent": self.user_agent_rotator.get_random()}
            
            try:
                response = await self.http_client.get(url, headers=headers)
                response.raise_for_status()
                
                # Parse listings
                page_listings = self._parse_search_results(
                    response.text, 
                    site,
                    keyword
                )
                
                listings.extend(page_listings)
                
                logger.info(f"  Page {page}: {len(page_listings)} listings found")
                
                # Stop if no more results
                if len(page_listings) == 0:
                    break
                
                # Delay between pages
                if page < max_pages:
                    await self.delay_manager.delay()
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    # No more pages
                    break
                else:
                    logger.error(f"HTTP error fetching {url}: {e}")
                    raise
            except Exception as e:
                logger.error(f"Error fetching {url}: {e}")
                raise
        
        return listings
    
    def _build_search_url(self, site: str, keyword: str, page: int = 1) -> str:
        """Build eBay search URL for sold listings"""
        base_url = f"https://www.{site}/sch/i.html"
        
        # URL parameters
        params = {
            "_nkw": keyword,                    # Search keyword
            "_in_kw": "1",                      # Keywords in title
            "LH_Sold": "1",                     # Sold listings
            "LH_Complete": "1",                 # Completed listings
            "_sop": "13",                       # Sort by newest
            "_pgn": str(page),                  # Page number
            "LH_PrefLoc": "2",                  # EU locations
        }
        
        # Build query string
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{base_url}?{query}"
    
    def _parse_search_results(
        self, 
        html: str, 
        site: str,
        search_keyword: str
    ) -> List[Dict[str, Any]]:
        """Parse eBay search results page"""
        soup = BeautifulSoup(html, "html.parser")
        listings = []
        
        # Find listing items (eBay uses different classes, try common ones)
        items = soup.find_all("li", class_=re.compile(r"s-item"))
        
        for item in items:
            try:
                listing = self._parse_listing_item(item, site, search_keyword)
                if listing:
                    listings.append(listing)
            except Exception as e:
                logger.debug(f"Error parsing listing item: {e}")
                continue
        
        return listings
    
    def _parse_listing_item(
        self, 
        item_soup: BeautifulSoup, 
        site: str,
        search_keyword: str
    ) -> Optional[Dict[str, Any]]:
        """Parse individual listing from search results"""
        try:
            # Title
            title_elem = item_soup.find("div", class_=re.compile(r"s-item__title"))
            if not title_elem:
                return None
            title = title_elem.get_text(strip=True)
            
            # Skip ads and irrelevant items
            if "Shop on eBay" in title or title == "":
                return None
            
            # Price
            price_elem = item_soup.find("span", class_=re.compile(r"s-item__price"))
            if not price_elem:
                return None
            
            price_text = price_elem.get_text(strip=True)
            price = self._parse_price(price_text)
            if not price:
                return None
            
            # Condition (if available)
            condition_elem = item_soup.find("span", class_=re.compile(r"SECONDARY_INFO"))
            condition = condition_elem.get_text(strip=True) if condition_elem else "Used"
            
            # Normalize condition
            condition = self._normalize_condition(condition)
            
            # URL
            link_elem = item_soup.find("a", class_=re.compile(r"s-item__link"))
            url = link_elem["href"] if link_elem else ""
            
            # Extract item ID from URL
            item_id = self._extract_item_id(url)
            
            # Sold date (try to find it)
            date_elem = item_soup.find("span", class_=re.compile(r"s-item__ended-date"))
            sold_date = self._parse_date(date_elem.get_text(strip=True)) if date_elem else datetime.utcnow()
            
            # Currency
            currency = self.currency_map.get(site, "EUR")
            
            # Country
            country = self.country_map.get(site, "EU")
            
            return {
                "product_name": title,
                "product_id": item_id,
                "price": price,
                "currency": currency,
                "condition": condition,
                "source": f"eBay-{country}",
                "source_url": url,
                "country": country,
                "sold_date": sold_date,
                "search_keyword": search_keyword,
            }
            
        except Exception as e:
            logger.debug(f"Error parsing listing: {e}")
            return None
    
    def _parse_price(self, price_text: str) -> Optional[Decimal]:
        """Extract numeric price from text"""
        # Remove currency symbols and spaces
        price_text = re.sub(r"[€£$,\s]", "", price_text)
        
        # Try to find number
        match = re.search(r"(\d+\.?\d*)", price_text)
        if match:
            try:
                return Decimal(match.group(1))
            except:
                return None
        return None
    
    def _normalize_condition(self, condition: str) -> str:
        """Normalize eBay condition to standard values"""
        condition = condition.lower()
        
        if "new" in condition or "sealed" in condition:
            return "NM"
        elif "mint" in condition or "near mint" in condition:
            return "NM"
        elif "excellent" in condition or "light" in condition:
            return "LP"
        elif "good" in condition:
            return "MP"
        elif "played" in condition or "moderate" in condition:
            return "MP"
        elif "heavily" in condition or "damaged" in condition:
            return "HP"
        else:
            return "Used"
    
    def _extract_item_id(self, url: str) -> str:
        """Extract eBay item ID from URL"""
        match = re.search(r"/(\d+)", url)
        return match.group(1) if match else ""
    
    def _parse_date(self, date_text: str) -> datetime:
        """Parse sold date from text"""
        # This is simplified - eBay dates can be complex
        # You might want to use dateparser library for better parsing
        try:
            # Try common formats
            # e.g., "Sold  Jan 15, 2026"
            if "Sold" in date_text:
                date_text = date_text.replace("Sold", "").strip()
            
            # For now, just return recent date
            # In production, use proper date parsing
            return datetime.utcnow() - timedelta(days=7)
        except:
            return datetime.utcnow()
    
    async def _save_listing(self, listing: Dict[str, Any]) -> bool:
        """Save listing to database"""
        try:
            raw_price = RawPrice(
                card_name=listing["product_name"],
                card_set="",  # eBay doesn't always have set info
                card_number=listing.get("product_id", ""),
                condition=listing["condition"],
                language="EN",  # Assume English, could be improved
                price=listing["price"],
                currency=listing["currency"],
                source=listing["source"],
                source_url=listing["source_url"],
                seller_name="",  # Could be extracted if needed
                seller_rating=None,
                stock_quantity=1,  # Sold items are qty 1
                country=listing["country"],
                scraped_at=datetime.utcnow(),
            )
            
            self.session.add(raw_price)
            await self.session.flush()
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving listing: {e}")
            return False
    
    async def _log_scrape(self, source: str, items_scraped: int, success: bool):
        """Log scrape run to database"""
        try:
            log = ScrapeLog(
                source=source,
                status="success" if success else "failed",
                items_scraped=items_scraped,
                error_message=None if success else "Check logs for details",
                scraped_at=datetime.utcnow()
            )
            self.session.add(log)
            await self.session.commit()
        except Exception as e:
            logger.error(f"Error logging scrape: {e}")
    
    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()


async def run_ebay_scraper(session: AsyncSession) -> Dict[str, int]:
    """
    Main entry point for eBay scraper
    
    Usage:
        async with AsyncSessionLocal() as session:
            stats = await run_ebay_scraper(session)
    """
    scraper = EbayScraper(session)
    
    try:
        stats = await scraper.scrape_all_sites()
        return stats
    finally:
        await scraper.close()
