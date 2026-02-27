"""
Market data Pydantic schemas for signals, deal scores, and search
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from decimal import Decimal


class SignalResponse(BaseModel):
    """Schema for signal response"""
    id: int
    signal_type: str
    signal_level: str
    product_name: str
    product_set: Optional[str] = None
    category: Optional[str] = None
    current_price: Optional[float] = None
    market_avg_price: Optional[float] = None
    deal_score: Optional[float] = None
    description: Optional[str] = None
    confidence: Optional[float] = None
    priority: int
    detected_at: datetime
    expires_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: lambda v: float(v) if v is not None else None
        }


class DealScoreResponse(BaseModel):
    """Schema for deal score response"""
    id: int
    product_name: str
    product_set: Optional[str] = None
    category: Optional[str] = None
    current_price: float
    currency: str = "EUR"
    condition: Optional[str] = None
    market_avg_price: Optional[float] = None
    market_min_price: Optional[float] = None
    deal_score: float
    price_deviation_score: Optional[float] = None
    volume_trend_score: Optional[float] = None
    liquidity_score: Optional[float] = None
    popularity_score: Optional[float] = None
    confidence: Optional[float] = None
    data_quality: Optional[str] = None
    calculated_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: lambda v: float(v) if v is not None else None
        }


class MarketStatsResponse(BaseModel):
    """Schema for market statistics response"""
    id: int
    product_name: str
    product_set: Optional[str] = None
    category: Optional[str] = None
    avg_price_7d: Optional[Decimal] = None
    avg_price_30d: Optional[Decimal] = None
    volume_7d: Optional[int] = None
    volume_30d: Optional[int] = None
    price_trend_7d: Optional[Decimal] = None
    price_trend_30d: Optional[Decimal] = None
    liquidity_score: Optional[Decimal] = None
    calculated_at: datetime
    
    class Config:
        from_attributes = True


# ─── Search Schemas ───────────────────────────────────────────────

class CardSearchResult(BaseModel):
    """Single card in search results — aggregated from raw_prices"""
    card_name: str
    card_set: Optional[str] = None
    min_price: float
    avg_price: float
    max_price: float
    listings: int
    condition: Optional[str] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    last_seen: datetime

    # Optional: deal score if available
    deal_score: Optional[float] = None
    market_avg_price: Optional[float] = None

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v) if v is not None else None
        }


class SearchResponse(BaseModel):
    """Full search response with metadata"""
    query: str
    total_results: int
    results: List[CardSearchResult]
    has_more: bool = False
