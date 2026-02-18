"""
Base Scraper Class
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

import httpx
from bs4 import BeautifulSoup

from app.config import settings
from app.utils.rate_limiter import RateLimiter
from app.utils.proxy_manager import proxy_manager

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """
    Abstract base class for all scrapers
    Uses httpx + BeautifulSoup by default (more reliable than Playwright)
    """

    def __init__(self):
        self.name = self.__class__.__name__
        self.rate_limiter = RateLimiter(
            max_calls=settings.REQUESTS_PER_MINUTE,
            period=60,
        )
        self.client: Optional[httpx.AsyncClient] = None
        self.headers = {
            "User-Agent": settings.USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }

    async def setup_client(self):
        """
        Setup HTTP client
        """
        proxy_config = proxy_manager.get_proxy()
        proxies = None
        
        if proxy_config and proxy_config.get("server"):
            proxies = {
                "http://": proxy_config["server"],
                "https://": proxy_config["server"],
            }
            logger.info(f"Using proxy: {proxy_config['server']}")
        
        self.client = httpx.AsyncClient(
            headers=self.headers,
            proxies=proxies,
            timeout=settings.SCRAPE_TIMEOUT,
            follow_redirects=True,
        )

    async def cleanup_client(self):
        """
        Cleanup HTTP client
        """
        if self.client:
            await self.client.aclose()
            self.client = None

    async def get_html(self, url: str) -> str:
        """
        Get HTML content from URL with rate limiting
        """
        await self.rate_limiter.acquire()
        
        if not self.client:
            await self.setup_client()
        
        try:
            logger.debug(f"Fetching: {url}")
            response = await self.client.get(url)
            response.raise_for_status()
            return response.text
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error {e.response.status_code} for {url}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Request error for {url}: {e}")
            raise

    def parse_html(self, html: str) -> BeautifulSoup:
        """
        Parse HTML with BeautifulSoup
        """
        return BeautifulSoup(html, "lxml")

    @abstractmethod
    async def scrape(self) -> List[Dict[str, Any]]:
        """
        Main scraping logic - to be implemented by subclasses
        """
        pass

    @abstractmethod
    async def parse(self, html: str) -> List[Dict[str, Any]]:
        """
        Parse scraped data - to be implemented by subclasses
        """
        pass

    @abstractmethod
    async def save(self, data: List[Dict[str, Any]]) -> None:
        """
        Save scraped data to database - to be implemented by subclasses
        """
        pass
