"""
Rate Limiter Implementation
"""

import asyncio
import time
from collections import deque


class RateLimiter:
    """
    Token bucket rate limiter for async operations
    """

    def __init__(self, max_calls: int, period: int):
        """
        Initialize rate limiter
        
        Args:
            max_calls: Maximum number of calls allowed
            period: Time period in seconds
        """
        self.max_calls = max_calls
        self.period = period
        self.calls: deque = deque()
        self._lock = asyncio.Lock()

    async def acquire(self):
        """
        Acquire permission to make a call (blocks if rate limit exceeded)
        """
        async with self._lock:
            now = time.time()
            
            # Remove old calls outside the time window
            while self.calls and self.calls[0] <= now - self.period:
                self.calls.popleft()
            
            # If we've hit the limit, wait
            if len(self.calls) >= self.max_calls:
                sleep_time = self.calls[0] + self.period - now
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                    return await self.acquire()
            
            # Record this call
            self.calls.append(now)
