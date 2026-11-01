"""Grading company and grade on raw_prices

Parsed by the scraper from a graded listing's seller description (CardTrader
has no fields for them). NULL for ungraded listings and unclear descriptions.

Revision ID: 012_grading_fields
Revises: 011_graded_index
"""

from alembic import op

revision = "012_grading_fields"
down_revision = "011_graded_index"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "DO $$ BEGIN IF to_regclass('public.raw_prices') IS NOT NULL THEN "
        "ALTER TABLE raw_prices ADD COLUMN IF NOT EXISTS grading_company varchar(10); "
        "ALTER TABLE raw_prices ADD COLUMN IF NOT EXISTS grade numeric(3, 1); "
        "END IF; END $$"
    )


def downgrade():
    op.execute("ALTER TABLE raw_prices DROP COLUMN IF EXISTS grade")
    op.execute("ALTER TABLE raw_prices DROP COLUMN IF EXISTS grading_company")
