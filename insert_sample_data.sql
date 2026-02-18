-- Insert Sample Data for Pokemon Market Intelligence Dashboard
-- This creates realistic sample data so you can see how the platform works

-- Clear existing data (optional)
TRUNCATE TABLE deal_scores, market_statistics, signals, raw_prices CASCADE;

-- Insert sample raw prices
INSERT INTO raw_prices (
    product_name, product_id, product_set, category,
    price, currency, condition, country, availability,
    source, source_url, scraped_at
) VALUES
-- Charizard cards
('Charizard ex', 'sv3-125', 'Obsidian Flames', 'single', 45.99, 'EUR', 'NM', 'DE', 12, 'cardmarket', 'https://example.com', NOW() - INTERVAL '1 day'),
('Charizard ex', 'sv3-125', 'Obsidian Flames', 'single', 48.50, 'EUR', 'NM', 'FR', 8, 'cardmarket', 'https://example.com', NOW() - INTERVAL '1 day'),
('Charizard ex', 'sv3-125', 'Obsidian Flames', 'single', 52.00, 'EUR', 'NM', 'NL', 15, 'cardmarket', 'https://example.com', NOW() - INTERVAL '2 days'),
('Charizard ex', 'sv3-125', 'Obsidian Flames', 'single', 46.99, 'EUR', 'LP', 'ES', 20, 'cardmarket', 'https://example.com', NOW() - INTERVAL '3 days'),

-- Pikachu cards
('Pikachu VMAX', 'swsh4-44', 'Vivid Voltage', 'single', 8.99, 'EUR', 'NM', 'DE', 45, 'cardmarket', 'https://example.com', NOW() - INTERVAL '1 day'),
('Pikachu VMAX', 'swsh4-44', 'Vivid Voltage', 'single', 9.50, 'EUR', 'NM', 'FR', 32, 'cardmarket', 'https://example.com', NOW() - INTERVAL '2 days'),
('Pikachu VMAX', 'swsh4-44', 'Vivid Voltage', 'single', 11.00, 'EUR', 'NM', 'IT', 18, 'cardmarket', 'https://example.com', NOW() - INTERVAL '3 days'),

-- Mewtwo cards
('Mewtwo ex', 'sv1-150', '151', 'single', 65.00, 'EUR', 'NM', 'DE', 8, 'cardmarket', 'https://example.com', NOW() - INTERVAL '1 day'),
('Mewtwo ex', 'sv1-150', '151', 'single', 62.50, 'EUR', 'NM', 'FR', 12, 'cardmarket', 'https://example.com', NOW() - INTERVAL '1 day'),
('Mewtwo ex', 'sv1-150', '151', 'single', 68.00, 'EUR', 'LP', 'NL', 5, 'cardmarket', 'https://example.com', NOW() - INTERVAL '2 days'),

-- Sealed products
('Obsidian Flames Booster Box', 'sv3-bb', 'Obsidian Flames', 'sealed', 89.99, 'EUR', 'Sealed', 'DE', 25, 'cardmarket', 'https://example.com', NOW() - INTERVAL '1 day'),
('Obsidian Flames Booster Box', 'sv3-bb', 'Obsidian Flames', 'sealed', 92.00, 'EUR', 'Sealed', 'FR', 18, 'cardmarket', 'https://example.com', NOW() - INTERVAL '2 days'),
('151 Elite Trainer Box', 'sv1-etb', '151', 'sealed', 55.00, 'EUR', 'Sealed', 'ES', 30, 'cardmarket', 'https://example.com', NOW() - INTERVAL '1 day'),

-- More singles for variety
('Gardevoir ex', 'sv1-86', '151', 'single', 18.99, 'EUR', 'NM', 'DE', 22, 'cardmarket', 'https://example.com', NOW() - INTERVAL '1 day'),
('Gardevoir ex', 'sv1-86', '151', 'single', 19.50, 'EUR', 'NM', 'IT', 15, 'cardmarket', 'https://example.com', NOW() - INTERVAL '2 days'),

('Mew ex', 'sv1-151', '151', 'single', 42.00, 'EUR', 'NM', 'FR', 10, 'cardmarket', 'https://example.com', NOW() - INTERVAL '1 day'),
('Mew ex', 'sv1-151', '151', 'single', 39.99, 'EUR', 'NM', 'DE', 18, 'cardmarket', 'https://example.com', NOW() - INTERVAL '2 days');

-- Insert market statistics
INSERT INTO market_statistics (
    product_name, product_set, category,
    avg_price_7d, min_price_7d, max_price_7d, volume_7d, price_trend_7d,
    avg_price_30d, min_price_30d, max_price_30d, volume_30d, price_trend_30d,
    liquidity_score, volatility, sample_size, data_quality,
    calculated_at
) VALUES
('Charizard ex', 'Obsidian Flames', 'single', 48.37, 45.99, 52.00, 55, -2.5, 50.25, 45.99, 58.00, 220, -5.3, 85.5, 2.8, 55, 'high', NOW()),
('Pikachu VMAX', 'Vivid Voltage', 'single', 9.83, 8.99, 11.00, 95, 1.2, 9.50, 7.99, 11.50, 380, 3.5, 92.0, 0.9, 95, 'high', NOW()),
('Mewtwo ex', '151', 'single', 65.17, 62.50, 68.00, 25, -1.8, 67.00, 60.00, 72.00, 98, -4.2, 75.0, 2.5, 25, 'medium', NOW()),
('Gardevoir ex', '151', 'single', 19.25, 18.99, 19.50, 37, 0.5, 18.75, 17.50, 20.00, 145, 2.7, 88.0, 0.5, 37, 'high', NOW()),
('Mew ex', '151', 'single', 40.99, 39.99, 42.00, 28, -3.2, 43.50, 38.00, 46.00, 112, -5.7, 72.0, 2.1, 28, 'medium', NOW()),
('Obsidian Flames Booster Box', 'Obsidian Flames', 'sealed', 90.99, 89.99, 92.00, 43, -0.8, 91.50, 88.00, 95.00, 172, -0.5, 95.0, 1.0, 43, 'high', NOW()),
('151 Elite Trainer Box', '151', 'sealed', 55.00, 55.00, 55.00, 30, 0.0, 54.00, 52.00, 57.00, 120, 1.9, 90.0, 2.0, 30, 'high', NOW());

-- Insert deal scores
INSERT INTO deal_scores (
    product_name, product_set, category,
    current_price, deal_score,
    price_deviation, volume_trend, liquidity, set_popularity,
    is_active, calculated_at
) VALUES
-- High-value deals
('Charizard ex', 'Obsidian Flames', 'single', 45.99, 88, 35.5, 28.0, 17.1, 8.5, true, NOW()),
('Mew ex', '151', 'single', 39.99, 82, 32.8, 24.6, 14.4, 8.2, true, NOW()),
('Mewtwo ex', '151', 'single', 62.50, 76, 28.4, 22.8, 15.0, 7.6, true, NOW()),

-- Good deals
('Pikachu VMAX', 'Vivid Voltage', 'single', 8.99, 72, 24.8, 21.6, 18.4, 7.2, true, NOW()),
('Gardevoir ex', '151', 'single', 18.99, 68, 22.4, 20.4, 17.6, 6.8, true, NOW()),
('Obsidian Flames Booster Box', 'Obsidian Flames', 'sealed', 89.99, 65, 20.0, 19.5, 19.0, 6.5, true, NOW()),

-- Moderate deals
('151 Elite Trainer Box', '151', 'sealed', 55.00, 58, 16.8, 17.4, 18.0, 5.8, true, NOW());

-- Insert signals
INSERT INTO signals (
    product_name, product_set, category,
    signal_type, signal_level, description, priority,
    is_active, detected_at
) VALUES
-- High priority signals
('Charizard ex', 'Obsidian Flames', 'single', 'high_deal', 'high', 'Exceptional deal: 35.5% below market average. High trading volume indicates strong demand.', 95, true, NOW()),
('Mew ex', '151', 'single', 'undervalued', 'high', 'Significantly underpriced at €39.99. Market average is €43.50 with increasing demand.', 90, true, NOW()),

-- Medium priority signals  
('Mewtwo ex', '151', 'single', 'momentum', 'medium', 'Positive price trend with growing collector interest. Good entry point.', 75, true, NOW()),
('Pikachu VMAX', 'Vivid Voltage', 'single', 'high_deal', 'medium', 'Solid deal at €8.99. Popular card with consistent demand.', 72, true, NOW()),

-- Low priority signals
('Gardevoir ex', '151', 'single', 'undervalued', 'low', 'Slightly below market average. Moderate trading volume.', 60, true, NOW());

-- Success message
SELECT 'Sample data inserted successfully!' AS status;
SELECT COUNT(*) AS raw_prices_count FROM raw_prices;
SELECT COUNT(*) AS deal_scores_count FROM deal_scores;
SELECT COUNT(*) AS signals_count FROM signals;
SELECT COUNT(*) AS market_stats_count FROM market_statistics;
