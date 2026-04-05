"""Admin API response schemas."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ScrapeLogRow(BaseModel):
    source: Optional[str] = None
    status: Optional[str] = None
    items_scraped: Optional[int] = None
    errors_count: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class UserSummary(BaseModel):
    id: int
    email: str
    role: str
    is_verified: bool
    created_at: Optional[datetime] = None


class AdminStatsResponse(BaseModel):
    users_total: int
    users_verified: int
    users_by_role: dict
    raw_prices_count: int
    raw_distinct_cards: int
    signals_active: int
    deal_scores_active: int
    last_scrapes: List[ScrapeLogRow]
    recent_users: List[UserSummary]
