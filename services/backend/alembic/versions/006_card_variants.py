"""Card variants: tell same-named cards in one set apart

One set can hold several cards with the same name ("Charizard ex" regular
vs. special illustration rare). The analysis service now keys products by
CardTrader blueprint id (raw_prices.card_number) and labels them with the
printed collector number and rarity. Watchlist items can pin a variant.

The services' startup schema sync would add these columns too; doing it
here makes the order of deploys irrelevant (analysis reads
watchlist_items.card_number).

Revision ID: 006_variants
Revises: 005_drift
"""

from alembic import op

revision = "006_variants"
down_revision = "005_drift"
branch_labels = None
depends_on = None

COLUMNS = {
    "raw_prices": ["collector_number VARCHAR(50)", "rarity VARCHAR(100)"],
    "market_statistics": ["card_number VARCHAR(100)", "collector_number VARCHAR(50)", "rarity VARCHAR(100)"],
    "deal_scores": ["card_number VARCHAR(100)", "collector_number VARCHAR(50)", "rarity VARCHAR(100)"],
    "watchlist_items": ["card_number VARCHAR(100)"],
}


def upgrade():
    for table, columns in COLUMNS.items():
        adds = "; ".join(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {c}" for c in columns)
        op.execute(
            f"DO $$ BEGIN IF to_regclass('public.{table}') IS NOT NULL THEN {adds}; END IF; END $$"
        )


def downgrade():
    pass
