"""Drop the unused signals table

Written by the old analysis alert generator, which no longer exists; the
last reader (an admin counter) was removed in 008. ~55 MB of stale rows.
Dropped on the owner's explicit request (26 Oct 2026).

Revision ID: 009_drop_signals
Revises: 008_graded
"""

from alembic import op

revision = "009_drop_signals"
down_revision = "008_graded"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("DROP TABLE IF EXISTS signals")


def downgrade():
    pass
