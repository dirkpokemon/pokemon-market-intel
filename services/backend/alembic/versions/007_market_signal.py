"""Buy/wait signal columns on market_statistics and deal_scores

The analysis service writes market_signal (buy | wait | rising | falling |
stable) with the 7-day floor and supply changes it is based on. Startup
schema sync would add them too; doing it here makes deploy order irrelevant.

Revision ID: 007_signal
Revises: 006_variants
"""

from alembic import op

revision = "007_signal"
down_revision = "006_variants"
branch_labels = None
depends_on = None

COLUMNS = ["market_signal VARCHAR(20)", "floor_change_7d NUMERIC(6, 2)", "supply_change_7d NUMERIC(6, 2)"]


def upgrade():
    for table in ("market_statistics", "deal_scores"):
        adds = "; ".join(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {c}" for c in COLUMNS)
        op.execute(
            f"DO $$ BEGIN IF to_regclass('public.{table}') IS NOT NULL THEN {adds}; END IF; END $$"
        )


def downgrade():
    pass
