"""Disk guard: the scraper stops storing when the database nears the volume limit."""
import asyncio

from app.scrapers import cardtrader_scraper_new as scraper_module
from app.scrapers.cardtrader_scraper_new import CardTraderScraperV2


def _scraper():
    return CardTraderScraperV2()


def test_stops_above_limit(monkeypatch):
    async def big():
        return 3.4

    monkeypatch.setattr(scraper_module, "database_gb", big)
    msg = asyncio.run(_scraper()._database_too_big())
    assert msg and "3.40 GB" in msg and "stopped" in msg


def test_continues_below_limit(monkeypatch):
    async def small():
        return 1.1

    monkeypatch.setattr(scraper_module, "database_gb", small)
    assert asyncio.run(_scraper()._database_too_big()) is None


def test_unknown_size_does_not_block(monkeypatch):
    async def broken():
        raise RuntimeError("no connection")

    monkeypatch.setattr(scraper_module, "database_gb", broken)
    assert asyncio.run(_scraper()._database_too_big()) is None
