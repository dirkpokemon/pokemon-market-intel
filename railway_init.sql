-- Railway PostgreSQL Initialization
-- Creates all tables for Pokemon Market Intelligence EU

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

SET timezone = 'UTC';

-- ============================================
-- 1. USERS TABLE (with role enum)
-- ============================================
DO $$ BEGIN
    CREATE TYPE userrole AS ENUM ('free', 'paid', 'pro', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role userrole NOT NULL DEFAULT 'free',
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    subscription_status VARCHAR(50),
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- 2. RAW PRICES TABLE (append-only)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_raw_prices_card_name ON raw_prices(card_name);
CREATE INDEX IF NOT EXISTS idx_raw_prices_card_set ON raw_prices(card_set);
CREATE INDEX IF NOT EXISTS idx_raw_prices_source ON raw_prices(source);
CREATE INDEX IF NOT EXISTS idx_raw_prices_scraped_at ON raw_prices(scraped_at DESC);

-- ============================================
-- 3. SCRAPE LOGS TABLE
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_scrape_logs_source ON scrape_logs(source);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_started_at ON scrape_logs(started_at DESC);

-- ============================================
-- 4. MARKET STATISTICS TABLE
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_market_stats_product_name ON market_statistics(product_name);
CREATE INDEX IF NOT EXISTS idx_market_stats_calculated_at ON market_statistics(calculated_at);

-- ============================================
-- 5. DEAL SCORES TABLE
-- ============================================
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

-- ============================================
-- 6. SIGNALS TABLE
-- ============================================
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

-- ============================================
-- 7. ALERTS SENT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS alerts_sent (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    signal_id INTEGER NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    subject VARCHAR(500),
    message_preview VARCHAR(1000),
    sent_successfully BOOLEAN NOT NULL DEFAULT true,
    error_message VARCHAR(1000),
    external_message_id VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_sent_user_id ON alerts_sent(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_signal_id ON alerts_sent(signal_id);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_user_signal ON alerts_sent(user_id, signal_id);

-- ============================================
-- 8. ADD ALERT COLUMNS TO USERS
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS alert_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN DEFAULT true;

-- ============================================
-- 9. CREATE DEMO USER (paid account)
-- ============================================
INSERT INTO users (email, hashed_password, full_name, role, is_active, is_verified)
VALUES (
    'demo@pokemontel.eu',
    '$2b$12$LJ3m4ys3GZfnMQVbIE5B8eMmH5bCRFkTqF1XcxuEI6N1mXqODmYNK',
    'Demo User',
    'paid',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 10. INSERT SAMPLE DATA
-- ============================================

-- Sample raw prices
INSERT INTO raw_prices (card_name, card_set, card_number, condition, price, currency, source, scraped_at) VALUES
('Charizard ex', 'Obsidian Flames', '006/197', 'NM', 45.50, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Charizard ex', 'Obsidian Flames', '006/197', 'NM', 47.00, 'EUR', 'cardtrader', NOW() - INTERVAL '2 days'),
('Charizard ex', 'Obsidian Flames', '006/197', 'NM', 44.00, 'EUR', 'cardtrader', NOW() - INTERVAL '3 days'),
('Charizard ex', 'Obsidian Flames', '006/197', 'LP', 38.00, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Pikachu VMAX', 'Vivid Voltage', '044/185', 'NM', 28.50, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Pikachu VMAX', 'Vivid Voltage', '044/185', 'NM', 30.00, 'EUR', 'cardtrader', NOW() - INTERVAL '2 days'),
('Pikachu VMAX', 'Vivid Voltage', '044/185', 'NM', 27.00, 'EUR', 'cardtrader', NOW() - INTERVAL '4 days'),
('Mewtwo GX', 'Shiny Vault', 'SV59/SV94', 'NM', 15.00, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Mewtwo GX', 'Shiny Vault', 'SV59/SV94', 'NM', 16.50, 'EUR', 'cardtrader', NOW() - INTERVAL '3 days'),
('Umbreon VMAX Alt Art', 'Evolving Skies', '215/203', 'NM', 185.00, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Umbreon VMAX Alt Art', 'Evolving Skies', '215/203', 'NM', 190.00, 'EUR', 'cardtrader', NOW() - INTERVAL '2 days'),
('Umbreon VMAX Alt Art', 'Evolving Skies', '215/203', 'LP', 160.00, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Lugia V Alt Art', 'Silver Tempest', '186/195', 'NM', 75.00, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Lugia V Alt Art', 'Silver Tempest', '186/195', 'NM', 78.00, 'EUR', 'cardtrader', NOW() - INTERVAL '3 days'),
('Mew VMAX', 'Fusion Strike', '114/264', 'NM', 22.00, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Mew VMAX', 'Fusion Strike', '114/264', 'NM', 24.00, 'EUR', 'cardtrader', NOW() - INTERVAL '2 days'),
('Rayquaza VMAX Alt Art', 'Evolving Skies', '218/203', 'NM', 210.00, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Rayquaza VMAX Alt Art', 'Evolving Skies', '218/203', 'NM', 215.00, 'EUR', 'cardtrader', NOW() - INTERVAL '3 days'),
('Gengar VMAX Alt Art', 'Fusion Strike', '271/264', 'NM', 95.00, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Gengar VMAX Alt Art', 'Fusion Strike', '271/264', 'NM', 98.00, 'EUR', 'cardtrader', NOW() - INTERVAL '2 days'),
('Moonbreon', 'Pokemon 151', '133/165', 'NM', 55.00, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Moonbreon', 'Pokemon 151', '133/165', 'NM', 58.00, 'EUR', 'cardtrader', NOW() - INTERVAL '4 days'),
('Giratina V Alt Art', 'Lost Origin', '186/196', 'NM', 65.00, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Giratina V Alt Art', 'Lost Origin', '186/196', 'NM', 68.00, 'EUR', 'cardtrader', NOW() - INTERVAL '2 days'),
('Scarlet & Violet Booster Box', 'Scarlet & Violet', 'SEALED', 'Sealed', 125.00, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Scarlet & Violet Booster Box', 'Scarlet & Violet', 'SEALED', 'Sealed', 130.00, 'EUR', 'cardtrader', NOW() - INTERVAL '3 days'),
('Obsidian Flames ETB', 'Obsidian Flames', 'SEALED', 'Sealed', 42.00, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('Obsidian Flames ETB', 'Obsidian Flames', 'SEALED', 'Sealed', 45.00, 'EUR', 'cardtrader', NOW() - INTERVAL '2 days'),
('151 Booster Box (JP)', 'Pokemon 151', 'SEALED', 'Sealed', 85.00, 'EUR', 'cardtrader', NOW() - INTERVAL '1 day'),
('151 Booster Box (JP)', 'Pokemon 151', 'SEALED', 'Sealed', 88.00, 'EUR', 'cardtrader', NOW() - INTERVAL '4 days');

-- Sample deal scores
INSERT INTO deal_scores (product_name, product_set, category, current_price, currency, condition, source, market_avg_price, market_min_price, price_deviation_score, volume_trend_score, liquidity_score, popularity_score, deal_score, confidence, data_quality, is_active, calculated_at) VALUES
('Charizard ex', 'Obsidian Flames', 'single', 45.50, 'EUR', 'NM', 'cardtrader', 48.00, 44.00, 72.0, 65.0, 80.0, 90.0, 75.5, 85.0, 'high', true, NOW()),
('Pikachu VMAX', 'Vivid Voltage', 'single', 28.50, 'EUR', 'NM', 'cardtrader', 31.00, 27.00, 68.0, 60.0, 75.0, 85.0, 70.0, 80.0, 'high', true, NOW()),
('Umbreon VMAX Alt Art', 'Evolving Skies', 'single', 185.00, 'EUR', 'NM', 'cardtrader', 195.00, 180.00, 75.0, 70.0, 60.0, 95.0, 76.0, 82.0, 'high', true, NOW()),
('Lugia V Alt Art', 'Silver Tempest', 'single', 75.00, 'EUR', 'NM', 'cardtrader', 80.00, 72.00, 70.0, 55.0, 65.0, 80.0, 68.0, 78.0, 'high', true, NOW()),
('Rayquaza VMAX Alt Art', 'Evolving Skies', 'single', 210.00, 'EUR', 'NM', 'cardtrader', 220.00, 205.00, 74.0, 68.0, 55.0, 92.0, 73.5, 80.0, 'high', true, NOW()),
('Gengar VMAX Alt Art', 'Fusion Strike', 'single', 95.00, 'EUR', 'NM', 'cardtrader', 100.00, 90.00, 72.0, 62.0, 70.0, 78.0, 71.0, 82.0, 'high', true, NOW()),
('Moonbreon', 'Pokemon 151', 'single', 55.00, 'EUR', 'NM', 'cardtrader', 60.00, 52.00, 76.0, 72.0, 75.0, 88.0, 77.0, 85.0, 'high', true, NOW()),
('Giratina V Alt Art', 'Lost Origin', 'single', 65.00, 'EUR', 'NM', 'cardtrader', 70.00, 62.00, 71.0, 58.0, 68.0, 82.0, 69.5, 79.0, 'high', true, NOW()),
('Mewtwo GX', 'Shiny Vault', 'single', 15.00, 'EUR', 'NM', 'cardtrader', 17.00, 14.00, 80.0, 50.0, 85.0, 75.0, 73.0, 77.0, 'medium', true, NOW()),
('Mew VMAX', 'Fusion Strike', 'single', 22.00, 'EUR', 'NM', 'cardtrader', 25.00, 20.00, 82.0, 55.0, 78.0, 70.0, 74.5, 78.0, 'medium', true, NOW()),
('Scarlet & Violet Booster Box', 'Scarlet & Violet', 'sealed', 125.00, 'EUR', 'Sealed', 'cardtrader', 135.00, 120.00, 78.0, 65.0, 90.0, 85.0, 79.0, 88.0, 'high', true, NOW()),
('Obsidian Flames ETB', 'Obsidian Flames', 'sealed', 42.00, 'EUR', 'Sealed', 'cardtrader', 46.00, 40.00, 76.0, 60.0, 88.0, 80.0, 76.0, 85.0, 'high', true, NOW()),
('151 Booster Box (JP)', 'Pokemon 151', 'sealed', 85.00, 'EUR', 'Sealed', 'cardtrader', 90.00, 82.00, 74.0, 70.0, 72.0, 92.0, 76.5, 83.0, 'high', true, NOW());

-- Sample signals
INSERT INTO signals (signal_type, signal_level, product_name, product_set, category, current_price, market_avg_price, deal_score, description, confidence, priority, is_active, detected_at) VALUES
('undervalued', 'high', 'Mew VMAX', 'Fusion Strike', 'single', 22.00, 25.00, 74.5, 'Price 12% below market average - potential buying opportunity', 85.0, 1, true, NOW()),
('momentum', 'high', 'Charizard ex', 'Obsidian Flames', 'single', 45.50, 48.00, 75.5, 'Rising volume and price trend detected - strong momentum', 80.0, 1, true, NOW()),
('undervalued', 'medium', 'Pikachu VMAX', 'Vivid Voltage', 'single', 28.50, 31.00, 70.0, 'Price 8% below average - moderate opportunity', 75.0, 2, true, NOW()),
('arbitrage', 'high', 'Umbreon VMAX Alt Art', 'Evolving Skies', 'single', 185.00, 195.00, 76.0, 'Cross-country price difference of 18% detected', 82.0, 1, true, NOW()),
('momentum', 'medium', 'Moonbreon', 'Pokemon 151', 'single', 55.00, 60.00, 77.0, 'Steady price and volume increase over 7 days', 78.0, 2, true, NOW()),
('risk', 'high', 'Gengar VMAX Alt Art', 'Fusion Strike', 'single', 95.00, 100.00, 71.0, 'Volume decreasing while price rising - potential correction risk', 72.0, 1, true, NOW()),
('undervalued', 'medium', 'Scarlet & Violet Booster Box', 'Scarlet & Violet', 'sealed', 125.00, 135.00, 79.0, 'Sealed product 7% below market average', 80.0, 2, true, NOW()),
('momentum', 'high', '151 Booster Box (JP)', 'Pokemon 151', 'sealed', 85.00, 90.00, 76.5, 'Strong demand trend for Japanese sealed product', 83.0, 1, true, NOW());

SELECT 'All tables created and sample data inserted!' AS status;
