"""Run from services/scraper: python -m pytest tests"""
import pytest

from app.scrapers.grading import parse_grade


@pytest.mark.parametrize("text,expected", [
    ("PSA 10", ("PSA", 10.0)),
    ("Charizard ex psa10 gem mint", ("PSA", 10.0)),
    ("BGS 9.5 Gem Mint", ("BGS", 9.5)),
    ("Beckett 9,5", ("BGS", 9.5)),
    ("BGS Black Label 10", ("BGS", 10.0)),
    ("CGC Pristine 10", ("CGC", 10.0)),
    ("Graded by PSA - Grade: 9", ("PSA", 9.0)),
    ("PSA: 8", ("PSA", 8.0)),
    ("AP Grading 9", ("AP", 9.0)),
    ("PSA 10 - slab in perfect condition", ("PSA", 10.0)),
    ("PSA 10 PSA 10 cert 12345678", ("PSA", 10.0)),
])
def test_recognised(text, expected):
    assert parse_grade(text) == expected


@pytest.mark.parametrize("text", [
    None,
    "",
    "Near mint, ships in toploader",
    "PSA 9 or BGS 9.5 available, ask",   # two different grades
    "PSA cert 12345678",                  # number is a cert, not a grade
    "PSA 100",
    "PSA 11",
    "space 10",                           # 'pca' inside a word doesn't count
])
def test_not_recognised(text):
    assert parse_grade(text) == (None, None)
