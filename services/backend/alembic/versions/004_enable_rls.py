"""Enable Row-Level Security on all public tables

Without RLS, Supabase's PostgREST layer exposes every table to anyone who
knows the project URL + anon key. Our backend connects via a direct
PostgreSQL superuser connection which bypasses RLS, so this change is
completely safe and does not affect runtime behaviour.

With RLS enabled but NO permissive policies, the anon/authenticated roles
used by PostgREST are denied all access.  The postgres superuser (DATABASE_URL)
continues to read and write freely.

Revision ID: 004_rls
Revises: 003_perf
"""

from alembic import op

revision = "004_rls"
down_revision = "003_perf"
branch_labels = None
depends_on = None

# Every table in the public schema that must be locked down.
TABLES = [
    "users",
    "raw_prices",
    "market_statistics",
    "deal_scores",
    "signals",
    "scrape_logs",
    "watchlist_items",
]


def upgrade():
    for table in TABLES:
        # Enable RLS — no permissive policies means PostgREST gets nothing.
        op.execute(f"ALTER TABLE IF EXISTS {table} ENABLE ROW LEVEL SECURITY")
        # Force RLS even for table owners (extra safety; doesn't affect superuser).
        op.execute(f"ALTER TABLE IF EXISTS {table} FORCE ROW LEVEL SECURITY")


def downgrade():
    for table in TABLES:
        op.execute(f"ALTER TABLE IF EXISTS {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE IF EXISTS {table} DISABLE ROW LEVEL SECURITY")
