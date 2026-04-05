"""
Subscription API endpoints
Handles user subscription management and Stripe integration
"""

import logging
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import get_current_user
from app.core.stripe_prices import require_tier_for_checkout
from app.database import get_db
from app.models.user import User
from app.schemas.user import SubscriptionResponse


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


class CheckoutRequest(BaseModel):
    price_id: str = Field(..., min_length=1, description="Stripe Price ID for the subscription plan")


class PlanPricesResponse(BaseModel):
    """Public Stripe Price IDs for the pricing page (not secret)."""

    stripe_price_paid: Optional[str] = None
    stripe_price_pro: Optional[str] = None


@router.get("/plan-prices", response_model=PlanPricesResponse)
async def get_plan_prices():
    """
    Price IDs for Paid / Pro tiers. Used by the frontend when Docker build
    did not receive NEXT_PUBLIC_STRIPE_* (e.g. Railway without build-args).
    Configure STRIPE_PRICE_PAID and STRIPE_PRICE_PRO on the backend.
    """
    return PlanPricesResponse(
        stripe_price_paid=settings.stripe_paid_price_id or None,
        stripe_price_pro=settings.stripe_pro_price_id or None,
    )


@router.get("/status", response_model=SubscriptionResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's subscription status
    
    Returns subscription tier, status, and access levels
    """
    logger.info(f"User {current_user.email} checking subscription status")
    
    return SubscriptionResponse(
        role=current_user.role,
        subscription_status=current_user.subscription_status,
        subscription_end_date=current_user.subscription_end_date,
        is_premium=current_user.is_premium(),
        is_pro=current_user.is_pro(),
        stripe_customer_id=current_user.stripe_customer_id
    )


@router.post("/checkout", response_model=Dict[str, str])
async def create_checkout_session(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Stripe Checkout session (subscription). Body: {"price_id": "price_xxx"}.

    success → FRONTEND_URL/home?subscription=success
    cancel → FRONTEND_URL/pricing?canceled=1
    """
    try:
        app_tier = require_tier_for_checkout(body.price_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payments are not configured (missing STRIPE_SECRET_KEY)",
        )

    try:
        import stripe

        stripe.api_key = settings.STRIPE_SECRET_KEY
        base = settings.FRONTEND_URL.rstrip("/")

        # Create or retrieve Stripe customer
        if not current_user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                metadata={"user_id": str(current_user.id)},
            )
            current_user.stripe_customer_id = customer.id
            await db.commit()
            logger.info("Created Stripe customer for %s: %s", current_user.email, customer.id)

        checkout_session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            payment_method_types=["card"],
            line_items=[{"price": body.price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{base}/home?subscription=success",
            cancel_url=f"{base}/pricing?canceled=1",
            metadata={
                "user_id": str(current_user.id),
                "app_tier": app_tier,
            },
            subscription_data={
                "metadata": {
                    "user_id": str(current_user.id),
                    "app_tier": app_tier,
                }
            },
        )
        
        logger.info(f"Created checkout session for {current_user.email}: {checkout_session.id}")
        
        return {
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id
        }
        
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session"
        )


@router.post("/portal")
async def create_portal_session(
    current_user: User = Depends(get_current_user)
):
    """
    Create a Stripe customer portal session
    
    Allows users to manage their subscription, update payment method, etc.
    
    Returns portal session URL for redirect
    """
    if not current_user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No subscription found"
        )
    
    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        base = settings.FRONTEND_URL.rstrip("/")
        portal_session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            return_url=f"{base}/home",
        )
        
        logger.info(f"Created portal session for {current_user.email}")
        
        return {
            "portal_url": portal_session.url
        }
        
    except Exception as e:
        logger.error(f"Error creating portal session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create portal session"
        )
