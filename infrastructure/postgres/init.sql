-- Local Postgres bootstrap (docker-compose only).
--
-- The schema is NOT defined here: the backend's Alembic migrations
-- (services/backend/alembic) plus each service's additive schema sync on
-- startup create every table. This file used to define a different, older
-- schema (deal_scores.card_name, users.subscription_tier, ...) that broke the
-- services on a fresh database.

CREATE EXTENSION IF NOT EXISTS "pg_trgm";
SET timezone = 'UTC';
