"""Operator alert rules (pure functions, no database)."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.ops_alerts import run_problems, scrape_problems

NOW = datetime(2026, 11, 3, 7, 30, tzinfo=timezone.utc)


def scrape(status="success", items=340_000, hours_ago=1.5, error=None, naive=False):
    started = NOW - timedelta(hours=hours_ago)
    return SimpleNamespace(
        status=status, items_scraped=items, error_message=error,
        started_at=started.replace(tzinfo=None) if naive else started,
    )


def test_healthy_scrape_has_no_problems():
    assert scrape_problems(scrape(), [338_000, 341_000, 344_000], NOW) == []


def test_missed_run():
    problems = scrape_problems(scrape(hours_ago=26), [340_000], NOW)
    assert len(problems) == 1 and "overgeslagen" in problems[0]


def test_failed_scrape_mentions_error():
    problems = scrape_problems(scrape(status="failed", items=0, error="HTTP 401 Unauthorized"), [340_000], NOW)
    assert "failed" in problems[0] and "401" in problems[0]


def test_much_smaller_scrape():
    problems = scrape_problems(scrape(items=90_000), [338_000, 341_000, 344_000], NOW)
    assert "90000" in problems[0] and "341000" in problems[0]


def test_slightly_smaller_scrape_is_fine():
    assert scrape_problems(scrape(items=300_000), [338_000, 341_000], NOW) == []


def test_naive_timestamps_are_utc():
    assert scrape_problems(scrape(naive=True), [], NOW) == []


def test_no_scrape_at_all():
    assert scrape_problems(None, [], NOW)


def test_run_problems():
    assert run_problems(7500, 7400, 0.7) == []
    assert "niet berekend" in run_problems(0, 0, 0.7)[0]
    assert "deal scores" in run_problems(7500, 0, 0.7)[0]
    assert "GB" in run_problems(7500, 7400, 4.1)[0]
    assert run_problems(7500, 7400, None) == []
