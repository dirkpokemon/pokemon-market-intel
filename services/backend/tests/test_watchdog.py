"""Analysis watchdog rule (pure function)."""
from datetime import datetime, timedelta, timezone

from app.jobs.watchdog import stale_message

NOW = datetime(2026, 11, 3, 12, 15, tzinfo=timezone.utc)


def test_fresh_analysis_is_quiet():
    assert stale_message(NOW - timedelta(hours=5), NOW) is None
    assert stale_message((NOW - timedelta(hours=13)).replace(tzinfo=None), NOW) is None


def test_stale_analysis_is_reported():
    msg = stale_message(NOW - timedelta(hours=30), NOW)
    assert msg and "30 uur" in msg


def test_no_statistics_at_all():
    assert "nooit" in stale_message(None, NOW)


def test_database_size_warning():
    from app.jobs.watchdog import size_message

    assert size_message(None) is None
    assert size_message(1.2) is None
    msg = size_message(2.8)
    assert msg and "2.80 GB" in msg
