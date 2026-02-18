"""Create users table

Revision ID: 002_users
Revises: 
Create Date: 2026-01-14

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '002_users'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create user_role enum
    op.execute("CREATE TYPE userrole AS ENUM ('free', 'paid', 'pro', 'admin')")
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('role', sa.Enum('free', 'paid', 'pro', 'admin', name='userrole'), nullable=False),
        sa.Column('stripe_customer_id', sa.String(length=255), nullable=True),
        sa.Column('stripe_subscription_id', sa.String(length=255), nullable=True),
        sa.Column('subscription_status', sa.String(length=50), nullable=True),
        sa.Column('subscription_end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_role', 'users', ['role'])
    op.create_index('ix_users_stripe_customer_id', 'users', ['stripe_customer_id'], unique=True)
    op.create_index('ix_users_stripe_subscription_id', 'users', ['stripe_subscription_id'], unique=True)


def downgrade():
    op.drop_index('ix_users_stripe_subscription_id', table_name='users')
    op.drop_index('ix_users_stripe_customer_id', table_name='users')
    op.drop_index('ix_users_role', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_index('ix_users_id', table_name='users')
    op.drop_table('users')
    op.execute("DROP TYPE userrole")
