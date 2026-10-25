"""
Signed one-click unsubscribe links for digest and alert emails.

The token is an HMAC over (user_id, kind) with SECRET_KEY, so a link only
works for the user and mail type it was issued for and needs no DB state.
The analysis service builds the same links (see watchlist_notifier.py), so
the token format must stay in sync with that copy.
"""

import hashlib
import hmac
from typing import Literal
from urllib.parse import urlencode

from app.config import settings

Kind = Literal["digest", "alerts"]
KINDS = ("digest", "alerts")


def make_token(user_id: int, kind: Kind) -> str:
    msg = f"unsubscribe:{user_id}:{kind}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()[:32]


def verify_token(user_id: int, kind: str, token: str) -> bool:
    if kind not in KINDS:
        return False
    return hmac.compare_digest(make_token(user_id, kind), token or "")  # type: ignore[arg-type]


def unsubscribe_url(user_id: int, kind: Kind) -> str:
    query = urlencode({"u": user_id, "k": kind, "t": make_token(user_id, kind)})
    return f"{settings.FRONTEND_URL.rstrip('/')}/unsubscribe?{query}"
