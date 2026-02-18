-- Insert Sample Data for Pokemon Market Intelligence Dashboard
-- Fixed with correct column names

-- Clear existing data
TRUNCATE TABLE deal_scores, signals CASCADE;

-- Insert deal scores with realistic Pokémon card data
INSERT INTO deal_scores (
    product_name, product_set, category,
    current_price, market_avg_price, market_min_price,
    price_deviation_score, volume_trend_score, liquidity_score, popularity_score,
    deal_score, confidence, data_quality,
    is_active, calculated_at
) VALUES
-- Tier 1: Exceptional deals (Score 80+)
('Charizard ex (Special Illustration Rare)', 'Obsidian Flames', 'single', 45.99, 62.50, 42.00, 35.5, 28.0, 17.1, 8.5, 88.2, 92.0, 'high', true, NOW()),
('Mew ex (Full Art)', '151', 'single', 39.99, 54.00, 38.00, 32.8, 24.6, 14.4, 8.2, 82.4, 88.5, 'high', true, NOW()),
('Mewtwo ex (Hyper Rare)', '151', 'single', 62.50, 82.00, 60.00, 28.4, 22.8, 15.0, 7.6, 76.8, 85.0, 'high', true, NOW()),

-- Tier 2: Great deals (Score 65-79)
('Pikachu VMAX (Rainbow)', 'Vivid Voltage', 'single', 8.99, 12.50, 8.50, 24.8, 21.6, 18.4, 7.2, 72.0, 90.0, 'high', true, NOW()),
('Gardevoir ex', '151', 'single', 18.99, 24.00, 17.50, 22.4, 20.4, 17.6, 6.8, 68.2, 87.5, 'high', true, NOW()),
('Obsidian Flames Booster Box', 'Obsidian Flames', 'sealed', 89.99, 105.00, 88.00, 20.0, 19.5, 19.0, 6.5, 65.0, 95.0, 'high', true, NOW()),

-- Tier 3: Good deals (Score 60-64)
('Eevee Heroes Elite Trainer Box', 'Eevee Heroes', 'sealed', 55.00, 62.00, 53.00, 16.8, 17.4, 18.0, 5.8, 62.0, 88.0, 'high', true, NOW()),
('Iono (Full Art)', 'Paldea Evolved', 'single', 22.50, 26.00, 21.00, 18.2, 16.8, 16.0, 5.4, 60.4, 82.0, 'high', true, NOW());

-- Insert signals (market alerts)
INSERT INTO signals (
    signal_type, signal_level, product_name, product_set, category,
    current_price, market_avg_price, deal_score,
    description, confidence, priority,
    is_active, detected_at
) VALUES
-- High priority signals
('high_deal', 'high', 'Charizard ex (Special Illustration Rare)', 'Obsidian Flames', 'single', 
 45.99, 62.50, 88.2,
 'Exceptional deal alert! 🔥 Charizard ex available 26.4% below market average at €45.99. High trading volume indicates strong demand. Limited stock available.',
 92.0, 95, true, NOW() - INTERVAL '2 hours'),

('undervalued', 'high', 'Mew ex (Full Art)', '151', 'single',
 39.99, 54.00, 82.4,
 '💎 Significantly underpriced at €39.99. Market average is €54.00 with increasing demand. Perfect entry point for collectors.',
 88.5, 90, true, NOW() - INTERVAL '4 hours'),

-- Medium priority signals
('momentum', 'medium', 'Mewtwo ex (Hyper Rare)', '151', 'single',
 62.50, 82.00, 76.8,
 '📈 Positive price trend with growing collector interest. Good entry point before expected price increase.',
 85.0, 75, true, NOW() - INTERVAL '6 hours'),

('high_deal', 'medium', 'Pikachu VMAX (Rainbow)', 'Vivid Voltage', 'single',
 8.99, 12.50, 72.0,
 '⚡ Solid deal at €8.99 (28% below market). Popular card with consistent demand from collectors.',
 90.0, 72, true, NOW() - INTERVAL '8 hours'),

-- Low priority signals
('undervalued', 'low', 'Gardevoir ex', '151', 'single',
 18.99, 24.00, 68.2,
 'Slightly below market average at €18.99. Moderate trading volume with steady demand.',
 87.5, 60, true, NOW() - INTERVAL '12 hours');

-- Success output
SELECT '✅ Sample data inserted successfully!' AS status;
SELECT '📊 Summary:' AS info;
SELECT COUNT(*) || ' deal scores created' AS deals FROM deal_scores WHERE is_active = true;
SELECT COUNT(*) || ' active signals created' AS signals FROM signals WHERE is_active = true;
