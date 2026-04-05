"""
Stripe Price ID → app tier (paid / pro). Used by checkout and webhooks.
"""

import logging
from typing import Literal, Optional

from app.config import settings

logger = logging.getLogger(__name__)

Tier = Literal["paid", "pro"]


def tier_for_price_id(price_id: str) -> Optional[Tier]:
    """Map a Stripe Price ID to paid or pro, or None if unknown."""
    pid = (price_id or "").strip()
    if not pid:
        return None
    pro = settings.stripe_pro_price_id
    paid = settings.stripe_paid_price_id
    if pro and pid == pro:
        return "pro"
    if paid and pid == paid:
        return "paid"
    return None


def require_tier_for_checkout(price_id: str) -> Tier:
    """
    Resolve tier for checkout. If server has at least one price configured,
    reject unknown price IDs to avoid tampered requests.
    """
    tier = tier_for_price_id(price_id)
    if tier:
        return tier
    if settings.stripe_paid_price_id or settings.stripe_pro_price_id:
        logger.warning("Checkout rejected: unrecognized price_id")
        raise ValueError(
            "This subscription price is not configured on the server. "
            "Set STRIPE_PRICE_PAID and STRIPE_PRICE_PRO to match your Stripe Prices."
        )
    # Dev: no price env vars — allow checkout, default tier for metadata/webhook fallback
    logger.warning(
        "Neither STRIPE_PRICE_PAID nor STRIPE_PRICE_PRO is set; using tier=paid for checkout"
    )
    return "paid"


def role_from_subscription(subscription: dict) -> Tier:
    """
    Prefer subscription.metadata.app_tier from Checkout, then line item price id.
    Falls back to 'paid' so premium gates still work if metadata is missing.
    """
    md = subscription.get("metadata") or {}
    tier = md.get("app_tier")
    if tier in ("paid", "pro"):
        return tier  # type: ignore[return-value]

    items = subscription.get("items", {}).get("data") or []
    if items:
        price_obj = items[0].get("price")
        pid = None
        if isinstance(price_obj, dict):
            pid = price_obj.get("id")
        elif isinstance(price_obj, str):
            pid = price_obj
        if pid:
            mapped = tier_for_price_id(pid)
            if mapped:
                return mapped

    logger.warning(
        "Could not map subscription %s to tier; defaulting to paid",
        subscription.get("id", "?"),
    )
    return "paid"
