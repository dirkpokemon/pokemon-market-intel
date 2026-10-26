"""Language as a product dimension (Japanese cards as their own line)

The analysis service now keeps separate statistics per listing language
(EN, JP): a Japanese print is priced very differently from the English one,
and both share the same CardTrader blueprint id (card_number).

- daily_prices.language (NOT NULL, existing rows are English) becomes part
  of the unique product/day key.
- market_statistics, deal_scores and watchlist_items get a nullable
  language column; NULL means English.

Revision ID: 010_language
Revises: 009_drop_signals
"""

from alembic import op

revision = "010_language"
down_revision = "009_drop_signals"
branch_labels = None
depends_on = None


def upgrade():
    for table in ("market_statistics", "deal_scores", "watchlist_items"):
        op.execute(
            f"DO $$ BEGIN IF to_regclass('public.{table}') IS NOT NULL THEN "
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS language VARCHAR(10); END IF; END $$"
        )
    op.execute("""
        DO $$ BEGIN
          IF to_regclass('public.daily_prices') IS NOT NULL THEN
            ALTER TABLE daily_prices ADD COLUMN IF NOT EXISTS language VARCHAR(10);
            UPDATE daily_prices SET language = 'EN' WHERE language IS NULL;
            ALTER TABLE daily_prices ALTER COLUMN language SET DEFAULT 'EN';
            ALTER TABLE daily_prices ALTER COLUMN language SET NOT NULL;
            ALTER TABLE daily_prices DROP CONSTRAINT IF EXISTS uq_daily_prices_product_day;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_daily_prices_product_lang_day') THEN
              ALTER TABLE daily_prices ADD CONSTRAINT uq_daily_prices_product_lang_day
                UNIQUE (name_key, set_key, category, card_key, language, day);
            END IF;
          END IF;
        END $$
    """)


def downgrade():
    pass
