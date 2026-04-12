"""Add indexes for market API hot paths (deal_scores, raw_prices, signals)

Revision ID: 003_perf
Revises: 002_users
"""
from alembic import op

revision = "003_perf"
down_revision = "002_users"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_deal_scores_active_score "
        "ON deal_scores (is_active, deal_score DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_raw_prices_scraped_at_desc "
        "ON raw_prices (scraped_at DESC NULLS LAST)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_signals_active_priority_detected "
        "ON signals (is_active, priority DESC, detected_at DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_market_stats_calc_set "
        "ON market_statistics (calculated_at DESC, product_set)"
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_market_stats_calc_set")
    op.execute("DROP INDEX IF EXISTS ix_signals_active_priority_detected")
    op.execute("DROP INDEX IF EXISTS ix_raw_prices_scraped_at_desc")
    op.execute("DROP INDEX IF EXISTS ix_deal_scores_active_score")
