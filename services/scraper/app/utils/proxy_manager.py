"""
Proxy Manager with Rotation
"""

from typing import Dict, Optional, List
import random
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class ProxyManager:
    """
    Manages proxy rotation for scraping
    """

    def __init__(self):
        self.enabled = settings.PROXY_ENABLED
        self.proxies: List[Dict[str, str]] = []
        self.current_index = 0
        
        if self.enabled and settings.PROXY_URL:
            # Add main proxy
            self.proxies.append({
                "server": settings.PROXY_URL,
                "username": settings.PROXY_USERNAME,
                "password": settings.PROXY_PASSWORD,
            })
            logger.info(f"Proxy manager initialized with {len(self.proxies)} proxy(ies)")
        else:
            logger.info("Proxy manager disabled")

    def get_proxy(self) -> Optional[Dict[str, str]]:
        """
        Get next proxy in rotation
        """
        if not self.enabled or not self.proxies:
            return None
        
        # Round-robin selection
        proxy = self.proxies[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.proxies)
        
        return proxy

    def get_random_proxy(self) -> Optional[Dict[str, str]]:
        """
        Get random proxy
        """
        if not self.enabled or not self.proxies:
            return None
        
        return random.choice(self.proxies)

    def add_proxy(self, server: str, username: str = "", password: str = ""):
        """
        Add proxy to rotation pool
        """
        self.proxies.append({
            "server": server,
            "username": username,
            "password": password,
        })
        logger.info(f"Added proxy: {server}")

    def remove_proxy(self, server: str):
        """
        Remove proxy from pool
        """
        self.proxies = [p for p in self.proxies if p["server"] != server]
        logger.info(f"Removed proxy: {server}")


# Singleton instance
proxy_manager = ProxyManager()
