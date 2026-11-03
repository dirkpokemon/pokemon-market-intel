"""
GET /api/v1/cards and /cards/{card_number} with a stub database.

Run from services/backend:
DATABASE_URL=postgresql+asyncpg://x/y SECRET_KEY=x python -m pytest tests
"""
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.utils.cache import public_cache


def _row(card="1", lang="EN", name="Charizard ex", floor=80.0):
    return SimpleNamespace(
        card_number=card, language=lang, product_name=name, product_set="Obsidian Flames",
        collector_number="199", rarity="Special Illustration Rare", floor_price_30d=floor,
        avg_price_30d=95.0, current_price=78.0, min_price_30d=70.0, max_price_30d=110.0,
        price_trend_30d=-3.5, days_observed=20, sample_size=300, market_signal=None,
        floor_change_7d=None, supply_change_7d=None, calculated_at=None,
    )


class _Result:
    def __init__(self, rows):
        self.rows = rows

    def fetchone(self):
        return self.rows[0] if self.rows else None

    def fetchall(self):
        return self.rows


def _client(*results):
    queue = list(results)

    class DB:
        async def execute(self, *_):
            return _Result(queue.pop(0))

    async def dep():
        yield DB()

    app.dependency_overrides[get_db] = dep
    return TestClient(app)


def teardown_function():
    app.dependency_overrides.clear()
    public_cache.clear()


def test_card_page_with_languages_and_set():
    c = _client([_row()], [_row(lang="JP", floor=40.0)], [_row(card="2", name="Pikachu", floor=12.0)])
    body = c.get("/api/v1/cards/1").json()
    assert body["card"]["floor_price"] == 80.0
    assert body["typical_price"] == 95.0
    assert body["other_languages"][0]["language"] == "JP"
    assert body["same_set"][0]["product_name"] == "Pikachu"


def test_unknown_card_is_404():
    r = _client([]).get("/api/v1/cards/999")
    assert r.status_code == 404


def test_bad_language_is_422():
    assert _client().get("/api/v1/cards/1", params={"language": "XX"}).status_code == 422


def test_list_is_cached():
    public_cache.set("cards:all", None, ttl_seconds=0)
    c = _client([_row(), _row(card="2")])
    assert len(c.get("/api/v1/cards").json()) == 2
    # second call is served from the cache (the stub has no more results)
    assert len(c.get("/api/v1/cards").json()) == 2
