"""
GET /api/v1/grading with a stub database (no Postgres needed).

Run from services/backend:
DATABASE_URL=postgresql+asyncpg://x/y SECRET_KEY=x python -m pytest tests
"""
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app

STATS = SimpleNamespace(
    product_name="Charizard ex", product_set="Obsidian Flames", card_number="12345",
    collector_number="199", rarity="Special Illustration Rare", language="EN",
    floor_price_30d=80.0, avg_price_30d=95.0, days_observed=20, sample_size=300,
)
OFFERS = [
    SimpleNamespace(company="PSA", grade=10, min_price=310.0, listings=2),
    SimpleNamespace(company=None, grade=None, min_price=150.0, listings=1),
]


class _Result:
    def __init__(self, rows):
        self.rows = rows

    def fetchone(self):
        return self.rows[0] if self.rows else None

    def fetchall(self):
        return self.rows


def _db(stats):
    class DB:
        calls = 0

        async def execute(self, *_):
            DB.calls += 1
            if DB.calls == 1:
                return _Result([stats] if stats else [])
            return _Result(OFFERS)

    async def dep():
        yield DB()

    return dep


def _get(stats, **params):
    app.dependency_overrides[get_db] = _db(stats)
    try:
        return TestClient(app).get("/api/v1/grading", params={"name": "Charizard ex", "card_number": "12345", **params})
    finally:
        app.dependency_overrides.clear()


def test_returns_raw_price_offers_and_presets():
    body = _get(STATS, set="Obsidian Flames").json()
    assert body["raw"]["floor_price"] == 80.0
    assert body["graded"][0] == {"company": "PSA", "grade": 10.0, "min_price": 310.0, "listings": 2}
    assert body["graded"][1]["company"] is None
    assert {s["id"] for s in body["services"]} >= {"psa_frankfurt", "ap_grading"}
    assert body["selling_fee_pct"] > 0


def test_unknown_card_is_404_in_dutch():
    r = _get(None)
    assert r.status_code == 404
    assert "prijsdata" in r.json()["detail"]


def test_card_number_is_required():
    app.dependency_overrides[get_db] = _db(STATS)
    try:
        r = TestClient(app).get("/api/v1/grading", params={"name": "Charizard ex"})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 422
