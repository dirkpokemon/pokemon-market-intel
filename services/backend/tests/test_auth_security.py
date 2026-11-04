"""Password fingerprint in tokens and the per-key rate limiter (no database)."""
from app.core.rate_limit import RateLimiter
from app.core.security import password_version


def test_password_version_changes_with_password():
    a, b = password_version("$2b$12$old"), password_version("$2b$12$new")
    assert a != b and len(a) == 16
    assert password_version("$2b$12$old") == a


def test_rate_limiter_allow_per_key():
    limiter = RateLimiter(limit=3, window_seconds=3600)
    assert [limiter.allow("sam@x.nl") for _ in range(4)] == [True, True, True, False]
    assert limiter.allow("kim@x.nl")  # other key, own budget
