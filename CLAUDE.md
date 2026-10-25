# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

"TCG Pulse" — an EU Pokémon TCG price-intelligence SaaS. Monorepo with four services under `services/` sharing one PostgreSQL database: Railway Postgres in production since late April 2026 (it was briefly on Supabase before; the code still handles both). Production runs on Railway (each service has its own `railway.toml`). Railway service names: backend `pokemon-market-intel`, `Scraper`, `analysis`, frontend `charming-contentment` (see `scripts/update_railway_db.sh`); `docker-compose.yml` + `infrastructure/` (nginx, postgres init) are for local dev.

Product direction, the market research behind it and the prioritised feature roadmap live in `docs/product/roadmap.md` and `docs/product/propositie.md` — read them before proposing or building new features.

The many `*.md` status files at the repo root (`*_COMPLETE.md`, `*_FIXED.md`, `ARCHITECTURE.md`, etc.) are historical notes from earlier development sessions and are often stale — trust the code over them.

## Commands

Frontend (`services/frontend`, Next.js 14 App Router, TypeScript, Tailwind, Chart.js):
```bash
npm ci
npm run dev          # localhost:3000
npm run build        # output: 'standalone' (served via `node server.js` on Railway)
npm run lint         # next lint
npm run type-check   # tsc --noEmit
```

Backend (`services/backend`, FastAPI + async SQLAlchemy 2.0 + Alembic):
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000     # docs at /docs
alembic upgrade head
alembic revision -m "description"             # write migrations idempotently (IF NOT EXISTS / to_regclass)
```

Scraper / analysis (`services/scraper`, `services/analysis`):
```bash
python -m app.main          # long-running with APScheduler
python -m app.main --once   # single cycle then exit
```

Each service's `railway.toml` (start command, cron schedule, health check) is what production runs; the Railway API's service description may show stale dashboard values. Cron services show 0 running replicas between runs.

Analysis unit tests (pure scoring math, no DB needed; `DATABASE_URL` only has to be set):
```bash
cd services/analysis && pip install -r requirements-dev.txt
DATABASE_URL=postgresql://x/y python -m pytest tests
DATABASE_URL=postgresql://x/y python -m pytest tests/test_scoring.py::test_drop_below_usual_floor_scores_high
```

Each service has a `.env.example`. Docker: `docker-compose up -d`, or `./scripts/dev.sh {start|logs|shell <svc>}`. Pinned Python deps need Python 3.11 (they don't build on 3.13).

Backend unit tests (pure functions, e.g. the price-check verdict; no DB needed):
```bash
cd services/backend && DATABASE_URL=postgresql+asyncpg://x/y SECRET_KEY=x python -m pytest tests
```

There are no scraper/frontend test suites; verify frontend changes with `npm run lint` and `npm run type-check`.

## Architecture

Data flows one way through the shared database:

1. **Scraper** (Railway cron `0 6,18 * * *`, `--once`, ~340k listings and ~45-60 min per run): `CardTraderScraperV2` (`cardtrader_scraper_new.py`) stores every CardTrader marketplace listing for the target sets in `raw_prices`, then `CardMarketAPIClient` adds the MKM price guide (skipped without `CARDMARKET_*` credentials). Sealed products are stored with `card_number = NULL`, detected by `SEALED_KEYWORDS` on word boundaries. Each run writes a `scrape_logs` row.
2. **Analysis** (Railway cron `30 7,19 * * *`, `--once`): `AnalysisService._run_full_analysis_locked` prunes `raw_prices` older than `RAW_PRICES_RETENTION_DAYS` (3: ~340k rows per scrape, the Railway volume is 5 GB), then:
   - `MarketStatsCalculator` lets Postgres aggregate comparable listings (single NM listings in `INCLUDED_LANGUAGES`, prices in EUR) into one row per product per day and upserts them into `daily_prices`, the long-term price history (kept 180 days, under 1 MB per day). Days that raw_prices no longer fully covers are never overwritten. `scoring.product_stats` turns the last `LONG_WINDOW_DAYS` (30) of `daily_prices` into `market_statistics`.
   - Each run logs the database size and warns above `DB_SIZE_WARN_GB`.
   - `DealScoreCalculator` → `deal_scores`. A deal is the cheapest listing on the latest day vs. the product's usual floor (median of the daily cheapest listing). `avg_price_*` columns hold medians, not means.
   - `market_statistics` and `deal_scores` are fully replaced in one transaction per run.
   - `watchlist_notifier` emails users (via Brevo) whose target is at or below `market_statistics.current_price`.
3. **Backend** serves everything under `/api/v1` (routers in `app/api/`). It also runs the daily email digest in-process (APScheduler, 08:00 UTC).
4. **Frontend** calls the backend via `src/lib/api.ts`. The JWT is stored in `localStorage` as `access_token`. `NEXT_PUBLIC_API_URL` is inlined at build time, so the frontend must be rebuilt when it changes.

Cross-service gotchas:
- **Schema ownership**: each Python service has its own copy of the SQLAlchemy models for the shared tables. On startup every service runs `sync_schema` (`app/database.py`), which creates missing tables, adds missing nullable columns and enables RLS. It never drops anything. Alembic migrations in `services/backend/alembic/versions/` run first (`start.sh`) and must be idempotent, because production tables predate working migrations.
- **RLS**: every public table has RLS enabled without policies (added while the DB was on Supabase, where PostgREST would otherwise expose it; harmless on Railway). Don't use `FORCE ROW LEVEL SECURITY`: it would also lock out the app, which connects as the table owner.
- **Card variants**: one set can hold several cards with the same name ("Charizard ex" regular vs. special illustration rare, 10-100x price difference). A product is therefore name + set + category + `card_number` (for CardTrader the blueprint id; `''` for sealed); `collector_number` and `rarity` are display labels. `market_statistics`, `deal_scores` and `watchlist_items` all carry `card_number` — always filter on it when you have it. CardMarket rows use the printed number as `card_number`, so they don't merge with CardTrader variants.
- **Price check** (`/prijscheck` page, public `GET /api/v1/price-check/search` and `GET /api/v1/price-check`, rate-limited per IP): thresholds live in `backend/app/core/price_check.py`. It compares against ASKING prices, so the wording is "gebruikelijke laagste vraagprijs", and it never calls a listing fraud — only "ongebruikelijk laag, wees voorzichtig".
- **Product names**: names keep the scraped spelling (no title-casing or punctuation stripping). Matching across sources and tables is case-insensitive (`lower(...)`). The watchlist notifier additionally strips punctuation, so watchlist items saved under old normalized names still match.
- **Set names**: `services/backend/app/data/set_registry.py` is the single source of truth. Each entry's `aliases` lists every name variant seen in `deal_scores.product_set` / `raw_prices.card_set`, and endpoints match case-insensitively. The frontend gets sets from `/api/v1/sets`, so never hardcode a set list there. `GET /api/v1/sets/unmatched` (admin) lists scraped sets missing from the registry.
- **Subscription tiers**: the DB/API roles are `free` | `paid` | `pro` (+ `admin`), displayed as Free / Plus / Business (`src/lib/plans.ts`). Business is waitlist-only. Server-side gates use `get_current_premium_user` / `get_current_admin_user` from `app/core/dependencies.py`:
  - Free: max 20 deals with score ≥ 55.
  - Plus only: `/price_history` and `/market_stats`.
  - Admin only: `/import/*` and `/sets/unmatched`.

  Keep `PLAN_FEATURES` in sync with these gates.
- **Stripe**: `stripe_webhook.py` must accept both pre- and post-2025-03-31 payload shapes (`current_period_end` on items; `invoice.parent.subscription_details`). Deleting an account deletes the Stripe customer first and aborts if that fails.
- **Email**: the digest is opt-in (`email_digest_enabled` defaults to false) and goes only to verified users. Every digest/alert carries a signed one-click unsubscribe link (`/unsubscribe` page → `POST /api/v1/notifications/unsubscribe`). The token is an HMAC with `SECRET_KEY`, built in both `backend/app/core/unsubscribe.py` and `analysis/app/generators/watchlist_notifier.py`, so both services need the same `SECRET_KEY`. The sync email helpers in `backend/app/core/email.py` block, so call them via `run_in_threadpool`.
- Telegram support was removed for now. The `users.telegram_*` columns still exist in production but are unused.

## Legal constraints (don't regress)

- **Never display Pokémon card artwork or set logos** (© The Pokémon Company; no licence). `CardImage.tsx` and the set tiles are deliberately self-rendered (initials/name on a deterministic gradient), with no external image requests. Don't reintroduce pokemontcg.io or other image URLs.
- Keep the non-affiliation disclaimer, legal/privacy/terms pages, cookie banner, GDPR account deletion and unsubscribe links working.
