"""
Stripe Webhook Handler
Processes Stripe events for subscription management
"""

import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, UserRole
from app.config import settings


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stripe", tags=["Stripe"])


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Handle Stripe webhook events
    
    Processes subscription lifecycle events:
    - customer.subscription.created
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_succeeded
    - invoice.payment_failed
    """
    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        # Get webhook payload
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        if not sig_header:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Stripe signature"
            )
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            logger.error("Invalid payload")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payload"
            )
        except stripe.error.SignatureVerificationError:
            logger.error("Invalid signature")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature"
            )
        
        logger.info(f"Received Stripe event: {event['type']}")
        
        # Handle different event types
        if event["type"] == "customer.subscription.created":
            await handle_subscription_created(event["data"]["object"], db)
        
        elif event["type"] == "customer.subscription.updated":
            await handle_subscription_updated(event["data"]["object"], db)
        
        elif event["type"] == "customer.subscription.deleted":
            await handle_subscription_deleted(event["data"]["object"], db)
        
        elif event["type"] == "invoice.payment_succeeded":
            await handle_payment_succeeded(event["data"]["object"], db)
        
        elif event["type"] == "invoice.payment_failed":
            await handle_payment_failed(event["data"]["object"], db)
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )


async def handle_subscription_created(subscription: dict, db: AsyncSession):
    """Handle new subscription creation"""
    customer_id = subscription["customer"]
    subscription_id = subscription["id"]
    status_value = subscription["status"]
    
    # Find user by Stripe customer ID
    result = await db.execute(
        select(User).where(User.stripe_customer_id == customer_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        logger.error(f"User not found for customer {customer_id}")
        return
    
    # Determine role based on subscription metadata or price
    # You can customize this based on your Stripe product setup
    role = UserRole.PAID  # Default to paid
    
    # Update user subscription
    user.stripe_subscription_id = subscription_id
    user.subscription_status = status_value
    user.role = role
    
    # Set subscription end date
    current_period_end = subscription["current_period_end"]
    user.subscription_end_date = datetime.fromtimestamp(current_period_end)
    
    await db.commit()
    
    logger.info(f"Subscription created for user {user.email}: {subscription_id}")


async def handle_subscription_updated(subscription: dict, db: AsyncSession):
    """Handle subscription updates"""
    subscription_id = subscription["id"]
    status_value = subscription["status"]
    
    # Find user by subscription ID
    result = await db.execute(
        select(User).where(User.stripe_subscription_id == subscription_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        logger.error(f"User not found for subscription {subscription_id}")
        return
    
    # Update subscription status
    user.subscription_status = status_value
    
    # Update end date
    current_period_end = subscription["current_period_end"]
    user.subscription_end_date = datetime.fromtimestamp(current_period_end)
    
    # Handle cancellation
    if subscription.get("cancel_at_period_end"):
        logger.info(f"Subscription will cancel at period end for {user.email}")
    
    await db.commit()
    
    logger.info(f"Subscription updated for user {user.email}: {status_value}")


async def handle_subscription_deleted(subscription: dict, db: AsyncSession):
    """Handle subscription cancellation/deletion"""
    subscription_id = subscription["id"]
    
    # Find user by subscription ID
    result = await db.execute(
        select(User).where(User.stripe_subscription_id == subscription_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        logger.error(f"User not found for subscription {subscription_id}")
        return
    
    # Downgrade to free tier
    user.role = UserRole.FREE
    user.subscription_status = "canceled"
    user.subscription_end_date = datetime.utcnow()
    
    await db.commit()
    
    logger.info(f"Subscription canceled for user {user.email}")


async def handle_payment_succeeded(invoice: dict, db: AsyncSession):
    """Handle successful payment"""
    customer_id = invoice["customer"]
    subscription_id = invoice.get("subscription")
    
    if not subscription_id:
        return
    
    # Find user
    result = await db.execute(
        select(User).where(User.stripe_customer_id == customer_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        return
    
    # Ensure subscription is active
    if user.subscription_status != "active":
        user.subscription_status = "active"
        await db.commit()
    
    logger.info(f"Payment succeeded for user {user.email}")


async def handle_payment_failed(invoice: dict, db: AsyncSession):
    """Handle failed payment"""
    customer_id = invoice["customer"]
    
    # Find user
    result = await db.execute(
        select(User).where(User.stripe_customer_id == customer_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        return
    
    # Update subscription status
    user.subscription_status = "past_due"
    await db.commit()
    
    logger.warning(f"Payment failed for user {user.email}")
