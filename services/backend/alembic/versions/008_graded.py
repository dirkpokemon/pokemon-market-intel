"""Graded listings flag on raw_prices

CardTrader marks graded (slabbed) listings. They are kept out of the
comparable-listing statistics (a PSA 10 is not the same product as a raw
card) and stored for the grading calculator (roadmap #4).

Revision ID: 008_graded
Revises: 007_signal
"""

from alembic import op

revision = "008_graded"
down_revision = "007_signal"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "DO $$ BEGIN IF to_regclass('public.raw_prices') IS NOT NULL THEN "
        "ALTER TABLE raw_prices ADD COLUMN IF NOT EXISTS graded BOOLEAN; END IF; END $$"
    )


def downgrade():
    pass
