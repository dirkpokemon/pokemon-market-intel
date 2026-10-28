"""
Password-reset tokens (no database needed).

Run from services/backend:
DATABASE_URL=postgresql+asyncpg://x/y SECRET_KEY=x python -m pytest tests
"""
from app.core.password_reset import RESET_TOKEN_MINUTES, make_token, token_user_id, verify_token

NOW = 1_800_000_000.0
HASH = "$2b$12$oldhash"


def test_valid_token():
    token = make_token(42, HASH, now=NOW)
    assert token_user_id(token) == 42
    assert verify_token(token, 42, HASH, now=NOW + 60)


def test_expires():
    token = make_token(42, HASH, now=NOW)
    assert not verify_token(token, 42, HASH, now=NOW + RESET_TOKEN_MINUTES * 60 + 1)


def test_stops_working_after_password_change():
    token = make_token(42, HASH, now=NOW)
    assert not verify_token(token, 42, "$2b$12$newhash", now=NOW + 60)


def test_bound_to_user():
    token = make_token(42, HASH, now=NOW)
    forged = "43" + token[2:]
    assert not verify_token(forged, 43, HASH, now=NOW + 60)
    assert not verify_token(token, 43, HASH, now=NOW + 60)


def test_tampered_or_malformed():
    token = make_token(42, HASH, now=NOW)
    uid, exp, sig = token.split(".")
    assert not verify_token(f"{uid}.{int(exp) + 3600}.{sig}", 42, HASH, now=NOW)
    for bad in ("", "abc", "42.x.y", "42..", "x.1.sig"):
        assert token_user_id(bad) is None or not verify_token(bad, 42, HASH, now=NOW)
