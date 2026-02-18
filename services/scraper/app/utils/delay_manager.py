"""
Delay Manager
Implements randomized delays between requests for respectful scraping
"""

import asyncio
import random
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class DelayManager:
    """
    Manages delays between requests with randomization
    """
    
    def __init__(self, min_delay: float = 2.0, max_delay: float = 5.0):
        """
        Initialize delay manager
        
        Args:
            min_delay: Minimum delay in seconds
            max_delay: Maximum delay in seconds
        """
        self.min_delay = min_delay
        self.max_delay = max_delay
        logger.info(f"DelayManager initialized: {min_delay}s - {max_delay}s")
    
    async def wait(self, custom_delay: Optional[float] = None):
        """
        Wait for a randomized delay
        
        Args:
            custom_delay: If provided, use this delay instead of random
        """
        if custom_delay is not None:
            delay = custom_delay
        else:
            delay = random.uniform(self.min_delay, self.max_delay)
        
        logger.debug(f"Waiting {delay:.2f}s before next request")
        await asyncio.sleep(delay)
    
    async def wait_random(self, min_override: Optional[float] = None, 
                          max_override: Optional[float] = None):
        """
        Wait with optional override of min/max
        
        Args:
            min_override: Override minimum delay
            max_override: Override maximum delay
        """
        min_d = min_override if min_override is not None else self.min_delay
        max_d = max_override if max_override is not None else self.max_delay
        
        delay = random.uniform(min_d, max_d)
        logger.debug(f"Random delay: {delay:.2f}s")
        await asyncio.sleep(delay)
    
    async def wait_exponential(self, attempt: int, base_delay: float = 1.0):
        """
        Exponential backoff for retries
        
        Args:
            attempt: Retry attempt number (0-indexed)
            base_delay: Base delay multiplier
        """
        delay = base_delay * (2 ** attempt)
        logger.debug(f"Exponential backoff: attempt {attempt}, delay {delay:.2f}s")
        await asyncio.sleep(delay)
