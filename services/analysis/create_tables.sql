-- Create analysis tables
CREATE TABLE IF NOT EXISTS market_statistics (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(500) NOT NULL,
    product_set VARCHAR(255),
    category VARCHAR(50),
    
    avg_price_7d NUMERIC(10,2),
    min_price_7d NUMERIC(10,2),
    max_price_7d NUMERIC(10,2),
    volume_7d INTEGER,
    
    avg_price_30d NUMERIC(10,2),
    min_price_30d NUMERIC(10,2),
    max_price_30d NUMERIC(10,2),
    volume_30d INTEGER,
    
    price_trend_7d NUMERIC(5,2),
    price_trend_30d NUMERIC(5,2),
    volume_trend_7d NUMERIC(5,2),
    volume_trend_30d NUMERIC(5,2),
    
    liquidity_score NUMERIC(5,2),
    volatility NUMERIC(5,2),
    
    sample_size INTEGER,
    data_quality VARCHAR(20),
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_market_statistics_product_name ON market_statistics(product_name);
CREATE INDEX IF NOT EXISTS idx_market_statistics_calculated_at ON market_statistics(calculated_at);
CREATE INDEX IF NOT EXISTS idx_product_name_calculated ON market_statistics(product_name, calculated_at);
CREATE INDEX IF NOT EXISTS idx_product_set_calculated ON market_statistics(product_set, calculated_at);

CREATE TABLE IF NOT EXISTS deal_scores (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(500) NOT NULL,
    product_set VARCHAR(255),
    category VARCHAR(50),
    
    current_price NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    condition VARCHAR(50),
    source VARCHAR(255),
    
    market_avg_price NUMERIC(10,2),
    market_min_price NUMERIC(10,2),
    
    price_deviation_score NUMERIC(5,2),
    volume_trend_score NUMERIC(5,2),
    liquidity_score NUMERIC(5,2),
    popularity_score NUMERIC(5,2),
    
    deal_score NUMERIC(5,2) NOT NULL,
    
    confidence NUMERIC(5,2),
    data_quality VARCHAR(20),
    
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deal_scores_product_name ON deal_scores(product_name);
CREATE INDEX IF NOT EXISTS idx_deal_scores_deal_score ON deal_scores(deal_score);
CREATE INDEX IF NOT EXISTS idx_deal_scores_is_active ON deal_scores(is_active);
CREATE INDEX IF NOT EXISTS idx_deal_scores_calculated_at ON deal_scores(calculated_at);
CREATE INDEX IF NOT EXISTS idx_deal_score_active ON deal_scores(deal_score, is_active);
CREATE INDEX IF NOT EXISTS idx_product_score ON deal_scores(product_name, deal_score);

CREATE TABLE IF NOT EXISTS signals (
    id SERIAL PRIMARY KEY,
    signal_type VARCHAR(50) NOT NULL,
    signal_level VARCHAR(20) NOT NULL,
    
    product_name VARCHAR(500) NOT NULL,
    product_set VARCHAR(255),
    category VARCHAR(50),
    
    current_price NUMERIC(10,2),
    market_avg_price NUMERIC(10,2),
    deal_score NUMERIC(5,2),
    
    description TEXT,
    signal_metadata TEXT,
    
    confidence NUMERIC(5,2),
    priority INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signals_signal_type ON signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_signal_level ON signals(signal_level);
CREATE INDEX IF NOT EXISTS idx_signals_product_name ON signals(product_name);
CREATE INDEX IF NOT EXISTS idx_signals_is_active ON signals(is_active);
CREATE INDEX IF NOT EXISTS idx_signals_detected_at ON signals(detected_at);
CREATE INDEX IF NOT EXISTS idx_signal_type_level ON signals(signal_type, signal_level);
CREATE INDEX IF NOT EXISTS idx_signal_active ON signals(is_active, detected_at);
CREATE INDEX IF NOT EXISTS idx_signal_priority ON signals(priority, is_active);
