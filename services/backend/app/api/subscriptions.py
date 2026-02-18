"""
Subscription API endpoints
Handles user subscription management and Stripe integration
"""

import logging
from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import SubscriptionResponse
from app.core.dependencies import get_current_user
from app.config import settings


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


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
    price_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Stripe checkout session for subscription upgrade
    
    **price_id**: Stripe Price ID for the subscription plan
    
    Returns checkout session URL for redirect
    """
    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        # Create or retrieve Stripe customer
        if not current_user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                metadata={"user_id": str(current_user.id)}
            )
            current_user.stripe_customer_id = customer.id
            await db.commit()
            logger.info(f"Created Stripe customer for {current_user.email}: {customer.id}")
        
        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price": price_id,
                    "quantity": 1,
                },
            ],
            mode="subscription",
            success_url=f"{settings.FRONTEND_URL}/dashboard?success=true",
            cancel_url=f"{settings.FRONTEND_URL}/pricing?canceled=true",
            metadata={
                "user_id": str(current_user.id)
            }
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
        
        portal_session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            return_url=f"{settings.FRONTEND_URL}/dashboard",
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
