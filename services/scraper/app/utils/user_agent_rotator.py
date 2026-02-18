"""
User-Agent Rotation
Cycles through realistic browser user agents to avoid detection
"""

import random
from typing import List
import logging

logger = logging.getLogger(__name__)


class UserAgentRotator:
    """
    Manages rotation of User-Agent strings for scraping
    """
    
    def __init__(self, user_agents: List[str]):
        """
        Initialize with list of user agents
        
        Args:
            user_agents: List of user agent strings
        """
        self.user_agents = user_agents
        self.current_index = 0
        logger.info(f"UserAgentRotator initialized with {len(user_agents)} agents")
    
    def get_random(self) -> str:
        """
        Get a random user agent
        
        Returns:
            Random user agent string
        """
        return random.choice(self.user_agents)
    
    def get_next(self) -> str:
        """
        Get next user agent in rotation
        
        Returns:
            Next user agent string
        """
        agent = self.user_agents[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.user_agents)
        return agent
    
    def get_headers(self, random: bool = True) -> dict:
        """
        Get complete headers with user agent
        
        Args:
            random: If True, use random agent; if False, use rotation
            
        Returns:
            Dictionary of HTTP headers
        """
        user_agent = self.get_random() if random else self.get_next()
        
        return {
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Cache-Control": "max-age=0",
        }
