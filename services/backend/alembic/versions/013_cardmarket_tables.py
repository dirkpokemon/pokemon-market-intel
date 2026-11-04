"""Cardmarket price guide tables

cardmarket_prices holds Cardmarket's public price guide (imported nightly by
the scraper); cardmarket_map links CardTrader blueprints (our card_number) to
Cardmarket products. Created here too, so the backend can query them before
the scraper's first run with this code.

Revision ID: 013_cardmarket
Revises: 012_grading_fields
"""

from alembic import op

revision = "013_cardmarket"
down_revision = "012_grading_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS cardmarket_prices (
            id_product integer PRIMARY KEY,
            id_category integer,
            avg numeric(12, 2),
            low numeric(12, 2),
            trend numeric(12, 2),
            avg1 numeric(12, 2),
            avg7 numeric(12, 2),
            avg30 numeric(12, 2),
            guide_created_at timestamptz
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS cardmarket_map (
            card_number varchar(100) NOT NULL,
            id_product integer NOT NULL,
            updated_at timestamptz DEFAULT now(),
            PRIMARY KEY (card_number, id_product)
        )
    """)
    op.execute("ALTER TABLE cardmarket_prices ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE cardmarket_map ENABLE ROW LEVEL SECURITY")


def downgrade():
    op.execute("DROP TABLE IF EXISTS cardmarket_map")
    op.execute("DROP TABLE IF EXISTS cardmarket_prices")
