"""Partial index for graded listings per card

The price check shows "gegradeerd vanaf € X" per card. Graded listings are a
small fraction of raw_prices, so a partial index keeps that lookup fast
without indexing every listing.

Revision ID: 011_graded_index
Revises: 010_language
"""

from alembic import op

revision = "011_graded_index"
down_revision = "010_language"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "DO $$ BEGIN IF to_regclass('public.raw_prices') IS NOT NULL THEN "
        "CREATE INDEX IF NOT EXISTS ix_raw_prices_graded_card ON raw_prices (card_number, scraped_at) "
        "WHERE graded = true; END IF; END $$"
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_raw_prices_graded_card")
