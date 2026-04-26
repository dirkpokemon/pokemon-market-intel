"""
Notifications API — watchlist management, Telegram connect, and notification preferences.
"""
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.watchlist import WatchlistItem
from app.utils.telegram import send_message

logger = logging.getLogger(__name__)

router = APIRouter()

BOT_USERNAME = os.environ.get("TELEGRAM_BOT_USERNAME", "TCGPulseBot")


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class WatchlistCreate(BaseModel):
    card_name: str
    card_set: Optional[str] = None
    target_price: float


class WatchlistItemResponse(BaseModel):
    id: int
    card_name: str
    card_set: Optional[str]
    target_price: float
    current_price: Optional[float]
    is_active: bool
    notified_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationPreferences(BaseModel):
    email_digest_enabled: bool
    telegram_connected: bool


class NotificationPreferencesUpdate(BaseModel):
    email_digest_enabled: bool


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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Watchlist item not found")
    item.is_active = False
    await db.commit()


# ---------------------------------------------------------------------------
# Telegram connect endpoints
# ---------------------------------------------------------------------------


@router.get("/telegram/connect", tags=["Telegram"])
async def telegram_connect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Generate a one-time Telegram connect token and return the deep link.
    The token is valid for 15 minutes.
    """
    token = secrets.token_hex(4)  # 8-char hex
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)

    current_user.telegram_connect_token = token
    current_user.telegram_connect_token_expires = expires
    await db.commit()

    return {
        "token": token,
        "deep_link": f"https://t.me/{BOT_USERNAME}?start={token}",
        "expires_in": 900,
    }


@router.post("/telegram/webhook", tags=["Telegram"])
async def telegram_webhook(request: Request, db: AsyncSession = Depends(get_db)) -> Dict[str, str]:
    """
    Telegram Bot webhook handler.
    Processes /start <token> messages to link a Telegram account.
    Always returns HTTP 200 so Telegram doesn't retry.
    """
    try:
        update = await request.json()
    except Exception:
        # Malformed body — still return 200
        return {"ok": "true"}

    message = update.get("message") or update.get("edited_message")
    if not message:
        return {"ok": "true"}

    text = message.get("text", "")
    from_info = message.get("from", {})
    chat_id = str(message.get("chat", {}).get("id", ""))

    if not text.startswith("/start ") or not chat_id:
        return {"ok": "true"}

    token = text[len("/start "):].strip()
    if not token:
        return {"ok": "true"}

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(User).where(
            User.telegram_connect_token == token,
            User.telegram_connect_token_expires > now,
        )
    )
    user = result.scalar_one_or_none()

    if user is None:
        await send_message(
            chat_id,
            "Token ongeldig of verlopen. Probeer opnieuw via de website.",
        )
        return {"ok": "true"}

    user.telegram_chat_id = str(from_info.get("id", chat_id))
    user.telegram_connect_token = None
    user.telegram_connect_token_expires = None
    await db.commit()

    await send_message(
        chat_id,
        "Verbonden met TCG Pulse! Je ontvangt nu prijsalerts.",
    )
    return {"ok": "true"}


# ---------------------------------------------------------------------------
# Notification preferences
# ---------------------------------------------------------------------------


@router.patch("/notifications/preferences", response_model=NotificationPreferences, tags=["Notifications"])
async def update_notification_preferences(
    payload: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationPreferences:
    """Toggle email digest and view Telegram connection status."""
    current_user.email_digest_enabled = payload.email_digest_enabled
    await db.commit()
    return NotificationPreferences(
        email_digest_enabled=current_user.email_digest_enabled,
        telegram_connected=bool(current_user.telegram_chat_id),
    )


@router.get("/notifications/preferences", response_model=NotificationPreferences, tags=["Notifications"])
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
) -> NotificationPreferences:
    """Get current notification preferences."""
    return NotificationPreferences(
        email_digest_enabled=bool(getattr(current_user, "email_digest_enabled", True)),
        telegram_connected=bool(current_user.telegram_chat_id),
    )
