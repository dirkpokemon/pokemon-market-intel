"""
Authentication API endpoints
Handles user registration, login, email verification, and token management
"""

import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
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
            detail="Email already registered",
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
        verification_token=token,
        verification_token_expires=expires,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info("New user registered: %s", new_user.email)

    first_name = (user_data.full_name or user_data.email).split()[0]
    email_sent = send_verification_email(new_user.email, first_name, token)

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
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Account is already verified")

    token, expires = generate_verification_token()
    user.verification_token = token
    user.verification_token_expires = expires
    await db.commit()

    first_name = (user.full_name or user.email).split()[0]
    send_verification_email(user.email, first_name, token)

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
        raise HTTPException(status_code=400, detail="Invalid verification token")

    if user.is_verified:
        return {"message": "Email already verified. You can log in.", "already_verified": True}

    expires = user.verification_token_expires
    if expires:
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Verification token has expired. Please request a new one.")

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
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
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


@router.post("/logout")
async def logout():
    """Logout (client-side token removal)."""
    return {"message": "Successfully logged out"}


@router.get("/notifications/preferences", response_model=NotificationPrefsResponse)
async def get_notification_prefs(
    current_user: User = Depends(get_current_user),
):
    return NotificationPrefsResponse(
        alerts_enabled=current_user.alerts_enabled if current_user.alerts_enabled is not None else True,
        alert_email=current_user.alert_email,
        telegram_chat_id=current_user.telegram_chat_id,
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
    if prefs.telegram_chat_id is not None:
        current_user.telegram_chat_id = prefs.telegram_chat_id

    await db.commit()
    await db.refresh(current_user)

    logger.info("User %s updated notification preferences", current_user.email)

    return NotificationPrefsResponse(
        alerts_enabled=current_user.alerts_enabled if current_user.alerts_enabled is not None else True,
        alert_email=current_user.alert_email,
        telegram_chat_id=current_user.telegram_chat_id,
    )
