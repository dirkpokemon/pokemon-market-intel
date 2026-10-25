# PostgreSQL Database

## Schema

`init.sql` only enables extensions. Tables are created by the backend's Alembic
migrations and by each service's additive schema sync on startup
(`sync_schema` in `services/*/app/database.py`):

- **users**, **watchlist_items**: accounts, subscriptions, watchlist (backend)
- **raw_prices**, **scrape_logs**: append-only scraped listings (scraper)
- **market_statistics**, **deal_scores**: derived per run (analysis)
- **signals**: legacy, read only by the admin dashboard

## Migrations

Database migrations are managed through Alembic in the backend service.

## Backup Strategy

For production:
1. Automated daily backups
2. Point-in-time recovery enabled
3. EU region replication
4. 30-day retention policy
