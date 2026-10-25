"""Add indexes for market API hot paths (deal_scores, raw_prices, signals)

Revision ID: 003_perf
Revises: 002_users
"""
from alembic import op

revision = "003_perf"
down_revision = "002_users"
branch_labels = None
depends_on = None


INDEXES = [
    ("ix_deal_scores_active_score", "deal_scores", "(is_active, deal_score DESC)"),
    ("ix_raw_prices_scraped_at_desc", "raw_prices", "(scraped_at DESC NULLS LAST)"),
    ("ix_signals_active_priority_detected", "signals", "(is_active, priority DESC, detected_at DESC)"),
    ("ix_market_stats_calc_set", "market_statistics", "(calculated_at DESC, product_set)"),
]


def upgrade():
    # On a fresh database these tables do not exist yet (the services create
    # them on startup), so only index tables that are already there.
    for name, table, cols in INDEXES:
        op.execute(
            f"DO $$ BEGIN IF to_regclass('public.{table}') IS NOT NULL THEN "
            f"CREATE INDEX IF NOT EXISTS {name} ON {table} {cols}; END IF; END $$"
        )


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_market_stats_calc_set")
    op.execute("DROP INDEX IF EXISTS ix_signals_active_priority_detected")
    op.execute("DROP INDEX IF EXISTS ix_raw_prices_scraped_at_desc")
    op.execute("DROP INDEX IF EXISTS ix_deal_scores_active_score")
