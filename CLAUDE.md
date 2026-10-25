# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

"TCG Pulse" — an EU Pokémon TCG price-intelligence SaaS. Monorepo with four services under `services/` sharing one PostgreSQL database (Supabase in production; Railway Postgres also supported). Production runs on Railway (each service has its own `railway.toml`); `docker-compose.yml` + `infrastructure/` (nginx, postgres init) are for local dev.

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
python -m app.main --once   # single cycle then exit (what Railway cron runs)
```

Analysis unit tests (pure scoring math, no DB needed; `DATABASE_URL` only has to be set):
```bash
cd services/analysis && pip install -r requirements-dev.txt
DATABASE_URL=postgresql://x/y python -m pytest tests
DATABASE_URL=postgresql://x/y python -m pytest tests/test_scoring.py::test_drop_below_usual_floor_scores_high
```

Each service has a `.env.example`. Docker: `docker-compose up -d`, or `./scripts/dev.sh {start|logs|shell <svc>}`. Pinned Python deps need Python 3.11 (they don't build on 3.13).

There are no backend/scraper/frontend test suites; verify frontend changes with `npm run lint` and `npm run type-check`.

## Architecture

Data flows one way through the shared database:

1. **Scraper** (Railway cron `0 6,18 * * *`): `CardTraderScraperV2` (`cardtrader_scraper_new.py`) stores every CardTrader marketplace listing for the target sets in `raw_prices`, then `CardMarketAPIClient` adds the MKM price guide (skipped without `CARDMARKET_*` credentials). Sealed products are stored with `card_number = NULL`, detected by `SEALED_KEYWORDS` on word boundaries. Each run writes a `scrape_logs` row.
2. **Analysis** (Railway cron `30 7,19 * * *`): `AnalysisService._run_full_analysis_locked` prunes `raw_prices` older than 60 days, then:
   - `MarketStatsCalculator` lets Postgres aggregate comparable listings (single NM listings in `INCLUDED_LANGUAGES`, prices in EUR) into one row per product per day, and `scoring.product_stats` turns those into `market_statistics`.
   - `DealScoreCalculator` → `deal_scores`. A deal is the cheapest listing on the latest day vs. the product's usual floor (median of the daily cheapest listing). `avg_price_*` columns hold medians, not means.
   - Both tables are fully replaced in one transaction per run.
   - `watchlist_notifier` emails users (via Brevo) whose target is at or below `market_statistics.current_price`.
3. **Backend** serves everything under `/api/v1` (routers in `app/api/`). It also runs the daily email digest in-process (APScheduler, 08:00 UTC).
4. **Frontend** calls the backend via `src/lib/api.ts`. The JWT is stored in `localStorage` as `access_token`. `NEXT_PUBLIC_API_URL` is inlined at build time, so the frontend must be rebuilt when it changes.

Cross-service gotchas:
- **Schema ownership**: each Python service has its own copy of the SQLAlchemy models for the shared tables. On startup every service runs `sync_schema` (`app/database.py`), which creates missing tables, adds missing nullable columns and enables RLS. It never drops anything. Alembic migrations in `services/backend/alembic/versions/` run first (`start.sh`) and must be idempotent, because production tables predate working migrations.
- **RLS**: every public table has RLS enabled without policies, so Supabase's PostgREST (anon/authenticated) sees nothing. Don't use `FORCE ROW LEVEL SECURITY`: it would also lock out the app, which connects as the table owner.
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
