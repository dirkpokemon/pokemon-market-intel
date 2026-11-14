"""Empty raw_prices once to recover from a full volume (November 2026)

Fetching full sets (PR #26) made each scrape ~2M listings instead of ~340k,
and with three days of retention the 5 GB volume filled up on 7-8 November:
analysis and scrapes failed with "No space left on device". Deleting rows
does not give the space back to the file system, TRUNCATE does. raw_prices
only holds the latest scrapes; the price history (daily_prices), deals, users
and watchlists are untouched, and the next scrape refills the table.
Approved by the owner. Alembic runs this once (the version is recorded).

Revision ID: 015_empty_raw_prices
Revises: 014_unique_lower_email
"""

from alembic import op

revision = "015_empty_raw_prices"
down_revision = "014_unique_lower_email"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "DO $$ BEGIN IF to_regclass('public.raw_prices') IS NOT NULL THEN "
        "TRUNCATE TABLE raw_prices; END IF; END $$"
    )


def downgrade():
    pass  # the deleted rows can't come back; nothing to undo
