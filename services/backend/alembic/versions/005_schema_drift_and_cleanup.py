"""Bring users in line with the model, fix misclassified sealed rows

- users: add columns that were only ever created by hand / create_all
  (verification, alert preferences, digest opt-in). The digest is now opt-in,
  so new users default to email_digest_enabled = false. Existing values are
  left untouched.
- raw_prices: CardTrader singles whose name merely contained a sealed keyword
  as a substring ("Tinkaton" -> "tin", "Fighting Energy" -> "tin") were stored
  without card_number and therefore treated as sealed. Restore card_number
  (the blueprint id, also in source_url) for rows that do not match the
  word-boundary keyword list now used by the scraper.
- alembic_version: enable RLS like every other public table.

Old inactive deal_scores rows are removed by the analysis service, which now
replaces that table on every run (kept out of here: deleting millions of rows
during backend start-up could exceed the Railway health-check window).

Revision ID: 005_drift
Revises: 004_rls
"""

from alembic import op

revision = "005_drift"
down_revision = "004_rls"
branch_labels = None
depends_on = None

# Keep in sync with SEALED_KEYWORDS in services/scraper/app/scrapers/cardtrader_scraper_new.py
SEALED_KEYWORDS = [
    "booster box", "display box", "booster display",
    "elite trainer box", "etb", "trainer box",
    "blister pack", "blister",
    "tin", "collection box", "gift box",
    "premium collection", "special collection",
    "poster collection", "figure collection",
    "bundle", "starter deck", "theme deck",
    "v box", "vmax box", "ex box",
    "booster bundle",
    "build & battle", "build and battle",
    "mini tin", "pokeball tin", "poke ball tin",
    "advent calendar",
    "sleeved booster",
    "booster case", "display case",
    "3-pack", "3 pack",
    "binder",
    "playmat",
    "pin collection", "pin box",
    "collector chest", "collection chest",
    "ultra premium", "upc",
    "league battle deck",
]


def _sealed_regex() -> str:
    # Postgres ARE: \y = word boundary. Escape regex metacharacters per keyword.
    parts = []
    for kw in SEALED_KEYWORDS:
        escaped = "".join("\\" + ch if ch in ".^$*+?()[]{}|\\-" else ch for ch in kw)
        parts.append(escaped)
    return "\\y(" + "|".join(parts) + ")\\y"


def upgrade():
    op.execute("""
        DO $$ BEGIN
        IF to_regclass('public.users') IS NOT NULL THEN
            ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN DEFAULT TRUE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS alert_email VARCHAR(255);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS email_digest_enabled BOOLEAN DEFAULT FALSE;
            ALTER TABLE users ALTER COLUMN email_digest_enabled SET DEFAULT FALSE;
            UPDATE users SET alerts_enabled = TRUE WHERE alerts_enabled IS NULL;
            UPDATE users SET email_digest_enabled = FALSE WHERE email_digest_enabled IS NULL;
            CREATE INDEX IF NOT EXISTS ix_users_verification_token ON users (verification_token);
        END IF;
        END $$
    """)

    regex = _sealed_regex().replace("'", "''")
    op.execute(f"""
        DO $$ BEGIN
        IF to_regclass('public.raw_prices') IS NOT NULL THEN
            UPDATE raw_prices
            SET card_number = substring(source_url from '/cards/([0-9]+)$')
            WHERE source = 'CardTrader'
              AND card_number IS NULL
              AND source_url ~ '/cards/[0-9]+$'
              AND card_name !~* '{regex}';
        END IF;
        END $$
    """)

    # Supabase exposes every public table via PostgREST, alembic's own included
    op.execute("ALTER TABLE IF EXISTS alembic_version ENABLE ROW LEVEL SECURITY")


def downgrade():
    # Data fixes are not reversible; the added columns are used by the app.
    pass
