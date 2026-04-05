"""
Stripe Webhook Handler
Processes Stripe events for subscription management
"""

import logging
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.core.stripe_prices import role_from_subscription
from app.database import get_db
from app.models.user import User


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stripe", tags=["Stripe"])


def _stripe_ref_id(value) -> str | None:
    """Stripe JSON sometimes has 'cus_xxx' string, sometimes {'id': 'cus_xxx'}."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, dict) and value.get("id"):
        return value["id"]
    return None


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
        
        logger.info("Received Stripe event: %s", event["type"])

        if event["type"] == "checkout.session.completed":
            await handle_checkout_session_completed(event["data"]["object"], db)

        elif event["type"] == "customer.subscription.created":
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


async def handle_checkout_session_completed(session: dict, db: AsyncSession):
    """
    Reliable upgrade path: Checkout Session includes our metadata (user_id, app_tier).
    Add event 'checkout.session.completed' in Stripe Dashboard for this webhook.
    """
    if session.get("mode") != "subscription":
        return
    if session.get("payment_status") not in ("paid", "no_payment_required"):
        return

    md = session.get("metadata") or {}
    user_id_str = md.get("user_id")
    if not user_id_str:
        logger.error("checkout.session.completed: missing metadata user_id")
        return
    try:
        user_id = int(user_id_str)
    except ValueError:
        logger.error("checkout.session.completed: invalid user_id %s", user_id_str)
        return

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        logger.error("checkout.session.completed: no user with id %s", user_id)
        return

    customer_id = _stripe_ref_id(session.get("customer"))
    subscription_id = _stripe_ref_id(session.get("subscription"))

    if customer_id:
        user.stripe_customer_id = customer_id
    if subscription_id:
        user.stripe_subscription_id = subscription_id

    user.subscription_status = "active"

    if user.role != "admin":
        tier = md.get("app_tier")
        if tier in ("paid", "pro"):
            user.role = tier
        else:
            user.role = "paid"

    await db.commit()
    logger.info("checkout.session.completed: user %s role=%s", user.email, user.role)


async def handle_subscription_created(subscription: dict, db: AsyncSession):
    """Handle new subscription creation"""
    customer_id = _stripe_ref_id(subscription.get("customer"))
    subscription_id = subscription["id"]
    status_value = subscription["status"]

    if not customer_id:
        logger.error("subscription.created: missing customer id")
        return

    result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
    user = result.scalar_one_or_none()

    if not user:
        uid = (subscription.get("metadata") or {}).get("user_id")
        if uid:
            try:
                result = await db.execute(select(User).where(User.id == int(uid)))
                user = result.scalar_one_or_none()
            except ValueError:
                user = None
        if not user:
            logger.error("User not found for customer %s (metadata user_id=%s)", customer_id, uid)
            return

    user.stripe_subscription_id = subscription_id
    user.subscription_status = status_value
    if user.role != "admin":
        user.role = role_from_subscription(subscription)
    
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
    
    user.subscription_status = status_value

    current_period_end = subscription["current_period_end"]
    user.subscription_end_date = datetime.fromtimestamp(current_period_end)

    if status_value in ("active", "trialing", "past_due") and user.role != "admin":
        user.role = role_from_subscription(subscription)

    if subscription.get("cancel_at_period_end"):
        logger.info("Subscription will cancel at period end for %s", user.email)

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
    
    if user.role != "admin":
        user.role = "free"
    user.subscription_status = "canceled"
    user.subscription_end_date = datetime.utcnow()
    
    await db.commit()
    
    logger.info(f"Subscription canceled for user {user.email}")


async def handle_payment_succeeded(invoice: dict, db: AsyncSession):
    """Handle successful payment"""
    customer_id = _stripe_ref_id(invoice.get("customer"))
    if not customer_id:
        return
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
    customer_id = _stripe_ref_id(invoice.get("customer"))
    if not customer_id:
        return
    
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
