-- PostgreSQL Initialization Script
-- Creates database schema for Pokemon Market Intelligence EU

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- Set timezone to UTC
SET timezone = 'UTC';

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    tier VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Raw prices table (append-only)
CREATE TABLE IF NOT EXISTS raw_prices (
    id SERIAL PRIMARY KEY,
    card_name VARCHAR(500) NOT NULL,
    card_set VARCHAR(255),
    card_number VARCHAR(100),
    condition VARCHAR(50),
    language VARCHAR(10) DEFAULT 'EN',
    price NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    source VARCHAR(255) NOT NULL,
    source_url TEXT,
    seller_name VARCHAR(255),
    seller_rating NUMERIC(3, 2),
    stock_quantity INTEGER,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_raw_prices_card_name ON raw_prices(card_name);
CREATE INDEX idx_raw_prices_card_set ON raw_prices(card_set);
CREATE INDEX idx_raw_prices_source ON raw_prices(source);
CREATE INDEX idx_raw_prices_scraped_at ON raw_prices(scraped_at DESC);
CREATE INDEX idx_raw_prices_card_name_trgm ON raw_prices USING gin(card_name gin_trgm_ops);

-- Processed prices table (aggregated data)
CREATE TABLE IF NOT EXISTS processed_prices (
    id SERIAL PRIMARY KEY,
    card_name VARCHAR(500) NOT NULL,
    card_set VARCHAR(255),
    card_number VARCHAR(100),
    condition VARCHAR(50),
    avg_price NUMERIC(10, 2),
    min_price NUMERIC(10, 2),
    max_price NUMERIC(10, 2),
    median_price NUMERIC(10, 2),
    price_trend VARCHAR(20),
    sample_size INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_processed_prices_card_name ON processed_prices(card_name);
CREATE INDEX idx_processed_prices_card_set ON processed_prices(card_set);
CREATE INDEX idx_processed_prices_last_updated ON processed_prices(last_updated DESC);

-- Deal scores table
CREATE TABLE IF NOT EXISTS deal_scores (
    id SERIAL PRIMARY KEY,
    card_name VARCHAR(500) NOT NULL,
    card_set VARCHAR(255),
    current_price NUMERIC(10, 2) NOT NULL,
    average_price NUMERIC(10, 2) NOT NULL,
    score NUMERIC(5, 2) NOT NULL,
    deal_quality VARCHAR(20),
    source VARCHAR(255),
    source_url TEXT,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deal_scores_card_name ON deal_scores(card_name);
CREATE INDEX idx_deal_scores_score ON deal_scores(score DESC);
CREATE INDEX idx_deal_scores_calculated_at ON deal_scores(calculated_at DESC);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_name VARCHAR(500) NOT NULL,
    condition_type VARCHAR(50) NOT NULL,
    threshold NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_card_name ON alerts(card_name);
CREATE INDEX idx_alerts_is_active ON alerts(is_active);

-- Scrape logs table
CREATE TABLE IF NOT EXISTS scrape_logs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    items_scraped INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scrape_logs_source ON scrape_logs(source);
CREATE INDEX idx_scrape_logs_started_at ON scrape_logs(started_at DESC);

-- Market statistics table
CREATE TABLE IF NOT EXISTS market_statistics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(15, 2) NOT NULL,
    metric_metadata JSONB,
    period VARCHAR(20),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_market_statistics_metric_name ON market_statistics(metric_name);
CREATE INDEX idx_market_statistics_calculated_at ON market_statistics(calculated_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processed_prices_updated_at BEFORE UPDATE ON processed_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Partitioning for raw_prices (by month)
-- This can be set up for production to handle large volumes of data
-- Example: CREATE TABLE raw_prices_2024_01 PARTITION OF raw_prices
--          FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

COMMENT ON TABLE users IS 'User accounts and authentication';
COMMENT ON TABLE subscriptions IS 'User subscription information via Stripe';
COMMENT ON TABLE raw_prices IS 'Append-only raw price data from scrapers';
COMMENT ON TABLE processed_prices IS 'Aggregated and processed price data';
COMMENT ON TABLE deal_scores IS 'Calculated deal scores for listings';
COMMENT ON TABLE alerts IS 'User-configured price alerts';
COMMENT ON TABLE scrape_logs IS 'Scraping session logs';
COMMENT ON TABLE market_statistics IS 'Overall market statistics';
