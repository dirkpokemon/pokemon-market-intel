"""
Small in-process rate limiter for public (no-login) endpoints.

The backend runs as a single Railway replica, so a module-level dict is
enough (same reasoning as app/utils/cache.py). Keyed by client IP, taken
from X-Forwarded-For because Railway's proxy terminates the connection.
"""

import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import HTTPException, Request, status


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimiter:
    """Sliding window: at most `limit` calls per `window_seconds` per IP."""

    def __init__(self, limit: int, window_seconds: int = 60):
        self.limit = limit
        self.window = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def __call__(self, request: Request) -> None:
        now = time.monotonic()
        key = client_ip(request)
        hits = self._hits[key]
        while hits and now - hits[0] > self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Te veel verzoeken. Probeer het over een minuut opnieuw.",
                headers={"Retry-After": str(self.window)},
            )
        hits.append(now)
        if len(self._hits) > 10_000:  # keep memory bounded
            for ip in [ip for ip, h in self._hits.items() if not h or now - h[-1] > self.window]:
                del self._hits[ip]
