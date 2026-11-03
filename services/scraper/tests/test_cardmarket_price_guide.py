"""Run from services/scraper: python -m pytest tests"""
from app.scrapers.cardmarket_price_guide import parse_guide


def test_parse_guide():
    created, rows = parse_guide({
        "version": 1,
        "createdAt": "2026-11-03T02:49:42+0100",
        "priceGuides": [
            {"idProduct": 1, "idCategory": 51, "avg": 2.5, "low": 0.02, "trend": 1.99, "avg1": None, "avg7": 2.1, "avg30": 2.4},
            {"idProduct": "x"},                       # malformed: skipped
            {"idProduct": 2, "avg": -1, "trend": 3},  # negative = missing
        ],
    })
    assert created.isoformat() == "2026-11-03T02:49:42+01:00"
    assert [r["id_product"] for r in rows] == [1, 2]
    assert rows[0]["trend"] == 1.99 and rows[0]["avg1"] is None
    assert rows[1]["avg"] is None and rows[1]["trend"] == 3.0


def test_empty_guide():
    assert parse_guide({}) == (None, [])
