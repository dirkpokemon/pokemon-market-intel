"""Add analysis tables

Revision ID: 001_analysis
Revises: 
Create Date: 2026-01-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_analysis'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create market_statistics table
    op.create_table(
        'market_statistics',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('product_name', sa.String(length=500), nullable=False),
        sa.Column('product_set', sa.String(length=255), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True),
        
        sa.Column('avg_price_7d', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('min_price_7d', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('max_price_7d', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('volume_7d', sa.Integer(), nullable=True),
        
        sa.Column('avg_price_30d', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('min_price_30d', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('max_price_30d', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('volume_30d', sa.Integer(), nullable=True),
        
        sa.Column('price_trend_7d', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('price_trend_30d', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('volume_trend_7d', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('volume_trend_30d', sa.Numeric(precision=5, scale=2), nullable=True),
        
        sa.Column('liquidity_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('volatility', sa.Numeric(precision=5, scale=2), nullable=True),
        
        sa.Column('sample_size', sa.Integer(), nullable=True),
        sa.Column('data_quality', sa.String(length=20), nullable=True),
        
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_product_name_calculated', 'market_statistics', ['product_name', 'calculated_at'])
    op.create_index('idx_product_set_calculated', 'market_statistics', ['product_set', 'calculated_at'])
    op.create_index(op.f('ix_market_statistics_id'), 'market_statistics', ['id'])
    op.create_index(op.f('ix_market_statistics_calculated_at'), 'market_statistics', ['calculated_at'])
    op.create_index(op.f('ix_market_statistics_product_name'), 'market_statistics', ['product_name'])
    op.create_index(op.f('ix_market_statistics_product_set'), 'market_statistics', ['product_set'])
    
    # Create deal_scores table
    op.create_table(
        'deal_scores',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('product_name', sa.String(length=500), nullable=False),
        sa.Column('product_set', sa.String(length=255), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True),
        
        sa.Column('current_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='EUR', nullable=True),
        sa.Column('condition', sa.String(length=50), nullable=True),
        sa.Column('source', sa.String(length=255), nullable=True),
        
        sa.Column('market_avg_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('market_min_price', sa.Numeric(precision=10, scale=2), nullable=True),
        
        sa.Column('price_deviation_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('volume_trend_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('liquidity_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('popularity_score', sa.Numeric(precision=5, scale=2), nullable=True),
        
        sa.Column('deal_score', sa.Numeric(precision=5, scale=2), nullable=False),
        
        sa.Column('confidence', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('data_quality', sa.String(length=20), nullable=True),
        
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_deal_score_active', 'deal_scores', ['deal_score', 'is_active'])
    op.create_index('idx_product_score', 'deal_scores', ['product_name', 'deal_score'])
    op.create_index(op.f('ix_deal_scores_id'), 'deal_scores', ['id'])
    op.create_index(op.f('ix_deal_scores_deal_score'), 'deal_scores', ['deal_score'])
    op.create_index(op.f('ix_deal_scores_calculated_at'), 'deal_scores', ['calculated_at'])
    op.create_index(op.f('ix_deal_scores_is_active'), 'deal_scores', ['is_active'])
    op.create_index(op.f('ix_deal_scores_product_name'), 'deal_scores', ['product_name'])
    op.create_index(op.f('ix_deal_scores_product_set'), 'deal_scores', ['product_set'])
    
    # Create signals table
    op.create_table(
        'signals',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('signal_type', sa.String(length=50), nullable=False),
        sa.Column('signal_level', sa.String(length=20), nullable=False),
        
        sa.Column('product_name', sa.String(length=500), nullable=False),
        sa.Column('product_set', sa.String(length=255), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True),
        
        sa.Column('current_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('market_avg_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('deal_score', sa.Numeric(precision=5, scale=2), nullable=True),
        
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata', sa.Text(), nullable=True),
        
        sa.Column('confidence', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('priority', sa.Integer(), server_default='0', nullable=True),
        
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
        sa.Column('is_sent', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        
        sa.Column('detected_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_signal_type_level', 'signals', ['signal_type', 'signal_level'])
    op.create_index('idx_signal_active', 'signals', ['is_active', 'detected_at'])
    op.create_index('idx_signal_priority', 'signals', ['priority', 'is_active'])
    op.create_index(op.f('ix_signals_id'), 'signals', ['id'])
    op.create_index(op.f('ix_signals_signal_type'), 'signals', ['signal_type'])
    op.create_index(op.f('ix_signals_signal_level'), 'signals', ['signal_level'])
    op.create_index(op.f('ix_signals_product_name'), 'signals', ['product_name'])
    op.create_index(op.f('ix_signals_is_active'), 'signals', ['is_active'])
    op.create_index(op.f('ix_signals_detected_at'), 'signals', ['detected_at'])


def downgrade():
    # Drop signals table
    op.drop_index(op.f('ix_signals_detected_at'), table_name='signals')
    op.drop_index(op.f('ix_signals_is_active'), table_name='signals')
    op.drop_index(op.f('ix_signals_product_name'), table_name='signals')
    op.drop_index(op.f('ix_signals_signal_level'), table_name='signals')
    op.drop_index(op.f('ix_signals_signal_type'), table_name='signals')
    op.drop_index(op.f('ix_signals_id'), table_name='signals')
    op.drop_index('idx_signal_priority', table_name='signals')
    op.drop_index('idx_signal_active', table_name='signals')
    op.drop_index('idx_signal_type_level', table_name='signals')
    op.drop_table('signals')
    
    # Drop deal_scores table
    op.drop_index(op.f('ix_deal_scores_product_set'), table_name='deal_scores')
    op.drop_index(op.f('ix_deal_scores_product_name'), table_name='deal_scores')
    op.drop_index(op.f('ix_deal_scores_is_active'), table_name='deal_scores')
    op.drop_index(op.f('ix_deal_scores_calculated_at'), table_name='deal_scores')
    op.drop_index(op.f('ix_deal_scores_deal_score'), table_name='deal_scores')
    op.drop_index(op.f('ix_deal_scores_id'), table_name='deal_scores')
    op.drop_index('idx_product_score', table_name='deal_scores')
    op.drop_index('idx_deal_score_active', table_name='deal_scores')
    op.drop_table('deal_scores')
    
    # Drop market_statistics table
    op.drop_index(op.f('ix_market_statistics_product_set'), table_name='market_statistics')
    op.drop_index(op.f('ix_market_statistics_product_name'), table_name='market_statistics')
    op.drop_index(op.f('ix_market_statistics_calculated_at'), table_name='market_statistics')
    op.drop_index(op.f('ix_market_statistics_id'), table_name='market_statistics')
    op.drop_index('idx_product_set_calculated', table_name='market_statistics')
    op.drop_index('idx_product_name_calculated', table_name='market_statistics')
    op.drop_table('market_statistics')
