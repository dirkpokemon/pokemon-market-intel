# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

"TCG Pulse" — an EU Pokémon TCG price-intelligence SaaS. Monorepo with four services under `services/` sharing one PostgreSQL database. Production runs on Railway (each service has its own `railway.toml`); `docker-compose.yml` + `infrastructure/` (nginx, postgres init) are for local dev.

The many `*.md` status files at the repo root (`*_COMPLETE.md`, `*_FIXED.md`, etc.) are historical notes from earlier development sessions and are often stale — trust the code over them.

## Commands

Frontend (`services/frontend`, Next.js 14 App Router, TypeScript, Tailwind, Chart.js):
```bash
npm install
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
alembic revision --autogenerate -m "description"
```

Scraper / analysis (`services/scraper`, `services/analysis`):
```bash
python -m app.main          # long-running with APScheduler
python -m app.main --once   # single cycle then exit (what Railway cron runs)
```

Docker: `docker-compose up -d`, or `./scripts/dev.sh {start|logs|shell <svc>|test <svc>}`.

There is no real automated test suite. `services/scraper/test_scraper.py` and `services/analysis/test_analysis.py` are smoke scripts that need a live `DATABASE_URL`. Verify frontend changes with `npm run lint` and `npm run type-check`.

## Architecture

Data flows one way through the shared database:

1. **Scraper** (Railway cron `0 6,18 * * *`, `--once`): `run_scrape_cycle` uses the CardTrader API, then `run_cardmarket_scrape` pulls CardMarket price guides. Both append to `raw_prices`. `app/scrapers/` has many legacy and alternative scrapers (eBay, TCGplayer, Playwright variants, `*_new.py`); check `app/main.py` to see which ones are actually wired in.
2. **Analysis** (Railway cron `30 7,19 * * *`, `--once`): `AnalysisService._run_full_analysis_locked` runs raw_prices retention pruning, then `MarketStatsCalculator` → `market_statistics`, then `DealScoreCalculator` → `deal_scores` (skipped if no stats), then `watchlist_notifier` sends alerts.
3. **Backend** serves everything to the frontend under `/api/v1` (routers in `app/api/`: auth, market, subscriptions, stripe_webhook, admin, feedback, notifications). It also runs an in-process APScheduler job for the daily email digest (08:00 UTC) and registers a Telegram webhook on startup.
4. **Frontend** calls the backend via `src/lib/api.ts` (`NEXT_PUBLIC_API_URL`). The JWT is stored in `localStorage` as `access_token`.

Cross-service gotchas:
- **Each Python service has its own copy of the SQLAlchemy models** (`app/models/`) for the shared tables (`raw_prices`, `market_statistics`, `deal_scores`, …). A schema change has to be made in every service that uses the table, and in an Alembic migration in `services/backend/alembic/versions/`. All three services also call `Base.metadata.create_all` on startup as a fallback, and `start.sh` keeps booting even when `alembic upgrade` fails.
- **Set names**: `services/backend/app/data/set_registry.py` is the single source of truth for Pokémon sets. Each entry's `aliases` lists every name variant seen in `deal_scores.product_set` / `raw_prices.card_set`, and endpoints match with `ILIKE ANY(aliases)`. The frontend gets sets from `/api/v1/sets`, so never hardcode a set list in the frontend. To add a set, append an entry (no migration needed).
- **Subscription tiers**: the DB/API roles are `free` | `paid` | `pro`, displayed as Free / Plus / Business (`src/lib/plans.ts`). Business is waitlist-only for now. Gate backend endpoints with the dependencies in `app/core/dependencies.py` (`get_current_premium_user`, `get_current_pro_user`, `get_current_admin_user`). Stripe price IDs live in `app/core/stripe_prices.py`.

## Legal constraints (don't regress)

- **Never display Pokémon card artwork or set logos** (© The Pokémon Company; no licence). `CardImage.tsx` and the set tiles are deliberately self-rendered (initials/name on a deterministic gradient), with no external image requests. Don't reintroduce pokemontcg.io or other image URLs.
- Keep the non-affiliation disclaimer, legal/privacy/terms pages, cookie banner, and GDPR account deletion working.
