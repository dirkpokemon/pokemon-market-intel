# Scraper service

Collects Pokémon TCG listings into the shared `raw_prices` table (append-only).

| Scraper | File | Source |
|---|---|---|
| CardTrader | `app/scrapers/cardtrader_scraper_new.py` | CardTrader REST API: expansions → blueprints → every marketplace listing |
| CardMarket | `app/scrapers/cardmarket_api.py` | MKM API v2 price guide (LOW price, one row per card); skipped when the `CARDMARKET_*` credentials are missing |

Sealed products are stored with `card_number = NULL`; the analysis service uses
that to set `category = 'sealed'`. Detection is by keyword on word boundaries
(`SEALED_KEYWORDS`).

Each CardTrader run writes a `scrape_logs` row (`success` / `partial` / `no_data` /
`failed`). Single API failures are retried (429/5xx/timeouts, honouring
`Retry-After`) and then skipped; a rejected token or 25 consecutive failures
abort the run.

## Run

```bash
pip install -r requirements.txt
cp .env.example .env            # set DATABASE_URL and CARDTRADER_API_TOKEN
python -m app.main --once       # one cycle, then exit (what Railway's cron runs)
python -m app.main              # long-running with APScheduler
```
