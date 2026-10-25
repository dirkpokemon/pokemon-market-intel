"""
Unit tests for the price-check verdict and listing parser (no DB needed).

Run from services/backend:  DATABASE_URL=postgresql+asyncpg://x/y SECRET_KEY=x python -m pytest tests
"""
import pytest

from app.core.price_check import extract_price, judge_price, search_terms


@pytest.mark.parametrize(
    "price, expected",
    [
        (5.0, "suspicious_low"),    # < 60% of floor 10
        (8.0, "below_floor"),       # 80% of floor
        (10.0, "normal"),           # at floor
        (13.5, "normal"),           # <= 1.15 x typical 12
        (16.0, "high"),             # <= 1.5 x typical
        (19.0, "very_high"),
    ],
)
def test_verdict_bands(price, expected):
    assert judge_price(price, floor=10.0, typical=12.0, days_observed=20, observations=200).code == expected


def test_fair_offer_is_70_to_90_percent_of_floor():
    v = judge_price(50.0, floor=40.0, typical=50.0, days_observed=20, observations=100)
    assert (v.fair_offer_low, v.fair_offer_high) == (28.0, 36.0)
    assert round(v.pct_vs_floor) == 25
    assert v.pct_vs_typical == 0


def test_low_data_flag():
    assert judge_price(10, 10, 12, days_observed=2, observations=50).low_data
    assert judge_price(10, 10, 12, days_observed=10, observations=3).low_data
    assert not judge_price(10, 10, 12, days_observed=10, observations=50).low_data


def test_rejects_non_positive_inputs():
    with pytest.raises(ValueError):
        judge_price(0, 10, 12, 10, 50)


@pytest.mark.parametrize(
    "text, price",
    [
        ("Elite Trainer Box — Vinted — € 59", 59.0),
        ("Charizard ex 199/165 voor 45,50 euro", 45.5),
        ("Booster box €1.234,56 incl verzending", 1234.56),
        ("EUR 12.50 Pikachu", 12.5),
        ("Moonbreon 600€ vaste prijs", 600.0),
        ("Charizard ex 199/165", None),
    ],
)
def test_extract_price(text, price):
    assert extract_price(text) == price


def test_search_terms_drop_noise_and_prices():
    assert search_terms("Charizard ex 199 Obsidian Flames — Vinted — € 45 incl verzending") == [
        "charizard", "ex", "199", "obsidian", "flames",
    ]
    assert search_terms("Professor's Research te koop") == ["professor's", "research"]
