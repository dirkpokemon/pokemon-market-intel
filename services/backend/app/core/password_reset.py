"""
Signed password-reset links, with no extra database state.

The token is "<user_id>.<expiry>.<signature>", where the signature is an HMAC
with SECRET_KEY over the user id, the expiry and the user's current password
hash. Setting a new password changes that hash, so every link works once and
older links stop working as soon as the password changes.
"""

import hashlib
import hmac
import time
from typing import Optional

from app.config import settings

RESET_TOKEN_MINUTES = 60


def _signature(user_id: int, expires: int, password_hash: str) -> str:
    msg = f"reset:{user_id}:{expires}:{password_hash}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()[:40]


def make_token(user_id: int, password_hash: str, now: Optional[float] = None) -> str:
    expires = int((now if now is not None else time.time()) + RESET_TOKEN_MINUTES * 60)
    return f"{user_id}.{expires}.{_signature(user_id, expires, password_hash)}"


def token_user_id(token: str) -> Optional[int]:
    """User id from a well-formed token (not yet verified)."""
    parts = (token or "").split(".")
    if len(parts) != 3 or not parts[0].isdigit() or not parts[1].isdigit():
        return None
    return int(parts[0])


def verify_token(token: str, user_id: int, password_hash: str, now: Optional[float] = None) -> bool:
    parts = (token or "").split(".")
    if len(parts) != 3 or not parts[1].isdigit() or token_user_id(token) != user_id:
        return False
    expires = int(parts[1])
    if expires < (now if now is not None else time.time()):
        return False
    return hmac.compare_digest(_signature(user_id, expires, password_hash), parts[2])
