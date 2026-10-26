"""
Notifications API — watchlist management, notification preferences and
one-click unsubscribe from digest / alert emails.
"""
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.unsubscribe import verify_token
from app.database import get_db
from app.models.user import User
from app.models.watchlist import WatchlistItem

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class WatchlistCreate(BaseModel):
    card_name: str = Field(..., min_length=1, max_length=255)
    card_set: Optional[str] = Field(default=None, max_length=255)
    card_number: Optional[str] = Field(default=None, max_length=100)
    language: Optional[str] = Field(default=None, pattern="^(EN|JP)$")
    target_price: float = Field(..., gt=0)


class WatchlistItemResponse(BaseModel):
    id: int
    card_name: str
    card_set: Optional[str]
    card_number: Optional[str] = None
    language: Optional[str] = None
    target_price: float
    current_price: Optional[float]
    is_active: bool
    notified_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationPreferences(BaseModel):
    email_digest_enabled: bool


class NotificationPreferencesUpdate(BaseModel):
    email_digest_enabled: bool


class UnsubscribeRequest(BaseModel):
    u: int
    k: str
    t: str


# ---------------------------------------------------------------------------
# Watchlist endpoints
# ---------------------------------------------------------------------------


@router.get("/watchlist", response_model=List[WatchlistItemResponse], tags=["Watchlist"])
async def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[WatchlistItemResponse]:
    """Return the current user's active watchlist items."""
    result = await db.execute(
        select(WatchlistItem)
        .where(WatchlistItem.user_id == current_user.id, WatchlistItem.is_active == True)
        .order_by(WatchlistItem.created_at.desc())
    )
    items = result.scalars().all()
    return items  # type: ignore[return-value]


@router.post(
    "/watchlist",
    response_model=WatchlistItemResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Watchlist"],
)
async def add_watchlist_item(
    payload: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WatchlistItemResponse:
    """Add a card to the user's watchlist."""
    item = WatchlistItem(
        user_id=current_user.id,
        card_name=payload.card_name.strip(),
        card_set=payload.card_set.strip() if payload.card_set else None,
        card_number=payload.card_number.strip() if payload.card_number else None,
        language=payload.language if payload.language and payload.language != "EN" else None,
        target_price=payload.target_price,
        is_active=True,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item  # type: ignore[return-value]


@router.delete("/watchlist/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Watchlist"])
async def delete_watchlist_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft-delete (deactivate) a watchlist item owned by the current user."""
    result = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.id == item_id,
            WatchlistItem.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deze kaart staat niet (meer) in je watchlist")
    item.is_active = False
    await db.commit()


# ---------------------------------------------------------------------------
# Notification preferences
# ---------------------------------------------------------------------------


@router.patch("/notifications/preferences", response_model=NotificationPreferences, tags=["Notifications"])
async def update_notification_preferences(
    payload: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationPreferences:
    """Toggle the daily email digest."""
    current_user.email_digest_enabled = payload.email_digest_enabled
    await db.commit()
    return NotificationPreferences(email_digest_enabled=current_user.email_digest_enabled)


@router.get("/notifications/preferences", response_model=NotificationPreferences, tags=["Notifications"])
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
) -> NotificationPreferences:
    """Get current notification preferences."""
    return NotificationPreferences(email_digest_enabled=bool(current_user.email_digest_enabled))


@router.post("/notifications/unsubscribe", tags=["Notifications"])
async def unsubscribe(
    payload: UnsubscribeRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    One-click unsubscribe from the link in digest / alert emails (no login).
    k=digest turns off the daily digest, k=alerts turns off watchlist alerts.
    """
    if not verify_token(payload.u, payload.k, payload.t):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ongeldige afmeldlink")

    result = await db.execute(select(User).where(User.id == payload.u))
    user = result.scalar_one_or_none()
    if user is not None:
        if payload.k == "digest":
            user.email_digest_enabled = False
        else:
            user.alerts_enabled = False
        await db.commit()
        logger.info("User %s unsubscribed from %s emails", user.id, payload.k)

    # Same answer whether or not the user still exists (deleted accounts)
    return {"ok": True, "kind": payload.k}
