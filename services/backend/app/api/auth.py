"""
Authentication API endpoints
Handles user registration, login, email verification, and token management
"""

import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    NotificationPrefsUpdate, NotificationPrefsResponse,
)
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.dependencies import get_current_user
from app.core.email import generate_verification_token, send_verification_email
from app.config import settings


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user and send a verification email."""
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Er bestaat al een account met dit e-mailadres",
        )

    token, expires = generate_verification_token()
    hashed_password = get_password_hash(user_data.password)

    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        role="free",
        is_active=True,
        is_verified=False,
        email_digest_enabled=user_data.email_digest_enabled,
        verification_token=token,
        verification_token_expires=expires,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info("New user registered: %s", new_user.email)

    first_name = (user_data.full_name or user_data.email).split()[0]
    # Email helpers use blocking urllib/smtplib — keep them off the event loop
    email_sent = await run_in_threadpool(send_verification_email, new_user.email, first_name, token)

    frontend_url = settings.FRONTEND_URL.rstrip("/")
    verify_url = f"{frontend_url}/verify?token={token}"

    result: dict = {
        "message": "Account created. Please check your email to verify your account.",
        "email": new_user.email,
        "email_sent": email_sent,
    }
    if not email_sent:
        result["verify_url"] = verify_url

    return result


@router.post("/resend-verification")
async def resend_verification(
    user_data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """Resend the verification email (requires correct password)."""
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Onjuist e-mailadres of wachtwoord")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Je account is al bevestigd")

    token, expires = generate_verification_token()
    user.verification_token = token
    user.verification_token_expires = expires
    await db.commit()

    first_name = (user.full_name or user.email).split()[0]
    await run_in_threadpool(send_verification_email, user.email, first_name, token)

    return {"message": "Verification email resent. Please check your inbox."}


@router.get("/verify")
async def verify_email(
    token: str = Query(..., description="Verification token from email"),
    db: AsyncSession = Depends(get_db),
):
    """Verify a user's email address with the token from the email link."""
    result = await db.execute(
        select(User).where(User.verification_token == token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Ongeldige bevestigingslink")

    if user.is_verified:
        return {"message": "Email already verified. You can log in.", "already_verified": True}

    expires = user.verification_token_expires
    if expires:
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="De bevestigingslink is verlopen. Vraag een nieuwe aan.")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    await db.commit()

    logger.info("User verified: %s", user.email)

    return {"message": "Email verified successfully! You can now log in.", "verified": True}


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """Login with email and password. Account must be verified."""
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Onjuist e-mailadres of wachtwoord",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dit account is niet actief",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED",
        )

    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    logger.info("User logged in: %s", user.email)

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current authenticated user information."""
    return UserResponse.model_validate(current_user)


@router.post("/change-password")
async def change_password(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the current user's password."""
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Huidig wachtwoord is onjuist")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Nieuw wachtwoord moet minimaal 8 tekens zijn")

    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.hashed_password = get_password_hash(new_password)
    await db.commit()

    logger.info("Password changed for user: %s", current_user.email)
    return {"message": "Wachtwoord succesvol gewijzigd"}


@router.post("/logout")
async def logout():
    """Logout (client-side token removal)."""
    return {"message": "Successfully logged out"}


@router.delete("/account")
async def delete_account(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently delete the current user's account and personal data (GDPR erasure).

    Requires the account password for confirmation. Deletes the Stripe customer
    (which cancels any subscription), then the user's watchlist items and the
    user record itself.
    """
    from sqlalchemy import text as _sql_text

    password = data.get("password", "")
    if not verify_password(password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Wachtwoord is onjuist")

    user_id = current_user.id
    email = current_user.email

    # Stop billing before the user disappears: once the row is gone, Stripe
    # webhooks can no longer be matched to anyone. Deleting the Stripe customer
    # cancels its subscriptions immediately and removes the stored card data.
    # If Stripe fails we abort, so nobody keeps paying for a deleted account.
    if current_user.stripe_customer_id or current_user.stripe_subscription_id:
        if not settings.STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Je abonnement kan nu niet worden opgezegd. Probeer het later opnieuw of neem contact op.",
            )
        try:
            import stripe

            stripe.api_key = settings.STRIPE_SECRET_KEY
            if current_user.stripe_customer_id:
                await run_in_threadpool(stripe.Customer.delete, current_user.stripe_customer_id)
            else:
                await run_in_threadpool(stripe.Subscription.cancel, current_user.stripe_subscription_id)
        except Exception as exc:
            if getattr(exc, "code", None) != "resource_missing":
                logger.error("Stripe cleanup failed for user id=%s: %s", user_id, exc, exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Je abonnement kon niet worden opgezegd, je account is niet verwijderd. Probeer het opnieuw of neem contact op.",
                ) from exc

    # Delete personal data that references the user, then the user itself.
    await db.execute(
        _sql_text("DELETE FROM watchlist_items WHERE user_id = :uid"), {"uid": user_id}
    )
    await db.execute(_sql_text("DELETE FROM users WHERE id = :uid"), {"uid": user_id})
    await db.commit()

    logger.info("Account deleted (GDPR erasure) for user id=%s email=%s", user_id, email)
    return {"message": "Account en persoonlijke gegevens zijn definitief verwijderd."}


@router.get("/notifications/preferences", response_model=NotificationPrefsResponse)
async def get_notification_prefs(
    current_user: User = Depends(get_current_user),
):
    return NotificationPrefsResponse(
        alerts_enabled=current_user.alerts_enabled if current_user.alerts_enabled is not None else True,
        alert_email=current_user.alert_email,
    )


@router.put("/notifications/preferences", response_model=NotificationPrefsResponse)
async def update_notification_prefs(
    prefs: NotificationPrefsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if prefs.alerts_enabled is not None:
        current_user.alerts_enabled = prefs.alerts_enabled
    if prefs.alert_email is not None:
        current_user.alert_email = prefs.alert_email

    await db.commit()
    await db.refresh(current_user)

    logger.info("User %s updated notification preferences", current_user.email)

    return NotificationPrefsResponse(
        alerts_enabled=current_user.alerts_enabled if current_user.alerts_enabled is not None else True,
        alert_email=current_user.alert_email,
    )
