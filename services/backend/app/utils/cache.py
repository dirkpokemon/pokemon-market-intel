"""
Simple in-process TTL cache.

Keeps frequently-read, slow-changing data in memory so the backend
doesn't hit Supabase on every request.  No Redis needed — a single
Railway container is single-process, so a module-level dict works fine.

Usage:
    cache = TTLCache(ttl_seconds=600)

    value = cache.get("my_key")
    if value is None:
        value = await expensive_db_call()
        cache.set("my_key", value)
    return value
"""

import time
from typing import Any, Optional


class TTLCache:
    """Thread-safe (GIL-protected) in-memory key/value store with per-entry TTL."""

    def __init__(self, ttl_seconds: int = 600):
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[Any, float]] = {}  # key → (value, expires_at)

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.monotonic() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self._ttl
        self._store[key] = (value, time.monotonic() + ttl)

    def invalidate(self, key: str) -> None:
        self._store.pop(key, None)

    def clear(self) -> None:
        self._store.clear()

    def __len__(self) -> int:
        now = time.monotonic()
        return sum(1 for _, exp in self._store.values() if exp > now)


# ── Shared cache instances — one per logical group ───────────────────────────

# Public landing-page data: top deals, sets list (slow-changing, hit a lot)
public_cache = TTLCache(ttl_seconds=900)   # 15 min

# Authenticated dashboard data: digest, signals, deal_scores (no-param requests)
dashboard_cache = TTLCache(ttl_seconds=600)  # 10 min
