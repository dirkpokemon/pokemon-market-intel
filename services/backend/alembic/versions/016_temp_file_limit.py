"""Cap temporary files per query so one big sort can't fill the volume

In November 2026 an analysis sort filled base/pgsql_tmp and the volume ran
full. With temp_file_limit a query that needs more temporary space fails on
its own instead. 512 MB leaves room next to the data (the scraper stops at
3 GB) and the WAL on the 4.6 GB volume. Setting it needs a superuser (the app
connects as the database owner on Railway); without one this only logs a
notice.

Revision ID: 016_temp_file_limit
Revises: 015_empty_raw_prices
"""

from alembic import op

revision = "016_temp_file_limit"
down_revision = "015_empty_raw_prices"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "DO $$ BEGIN "
        "EXECUTE format('ALTER DATABASE %I SET temp_file_limit = %L', current_database(), '512MB'); "
        "EXCEPTION WHEN insufficient_privilege THEN "
        "RAISE NOTICE 'temp_file_limit not set: needs a superuser'; "
        "END $$"
    )


def downgrade():
    op.execute(
        "DO $$ BEGIN "
        "EXECUTE format('ALTER DATABASE %I RESET temp_file_limit', current_database()); "
        "EXCEPTION WHEN insufficient_privilege THEN NULL; "
        "END $$"
    )
