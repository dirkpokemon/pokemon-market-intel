"""One account per email address, ignoring case

New accounts are stored lower-cased and logins match case-insensitively. This
unique index on lower(email) makes the database refuse a second account for
the same address. If production already holds such a pair, the index is
skipped (with a notice) rather than failing the deploy; the app still matches
case-insensitively and prefers the exact-case account.

Revision ID: 014_unique_lower_email
Revises: 013_cardmarket
"""

from alembic import op

revision = "014_unique_lower_email"
down_revision = "013_cardmarket"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        DO $$
        BEGIN
            IF to_regclass('public.users') IS NULL THEN
                RETURN;
            END IF;
            IF EXISTS (SELECT 1 FROM users GROUP BY lower(email) HAVING count(*) > 1) THEN
                RAISE NOTICE 'users has emails that differ only in case; unique index skipped';
            ELSE
                CREATE UNIQUE INDEX IF NOT EXISTS uq_users_lower_email ON users (lower(email));
            END IF;
        END $$
    """)


def downgrade():
    op.execute("DROP INDEX IF EXISTS uq_users_lower_email")
