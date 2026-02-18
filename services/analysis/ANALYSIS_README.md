](#signal-types)
- [📊 Output Tables](#output-tables)
- [🚀 Usage](#usage)
- [⚙️ Configuration](#configuration)
- [📈 Monitoring](#monitoring)
- [🧮 Calculation Details](#calculation-details)

## Overview

The Analysis & Deal Score Engine processes raw price data to generate:
- **Market Statistics**: Average prices, volumes, trends
- **Deal Scores**: 0-100 rating of how good a deal is
- **Signals**: Automated alerts for opportunities and risks

## Architecture

```
Input: raw_prices table
   ↓
1. Data Normalization
   - Convert to EUR
   - Standardize conditions
   - Clean product names
   ↓
2. Market Statistics
   - Calculate 7d & 30d averages
   - Detect trends
   - Measure volatility
   ↓
3. Deal Score Calculation
   - Price deviation (40%)
   - Volume trend (30%)
   - Liquidity (20%)
   - Popularity (10%)
   ↓
4. Signal Generation
   - High/medium deals
   - Undervalued products
   - Momentum/risk signals
   ↓
Output: market_stats, deal_scores, signals tables
```

## Features

### ✅ **Data Normalization**
- **Currency Conversion**: All prices normalized to EUR
- **Condition Standardization**: NM, LP, MP, HP, etc.
- **Product Name Cleaning**: Consistent grouping
- **Outlier Detection**: Z-score method
- **Quality Scoring**: Based on sample size

### ✅ **Market Statistics**
Per product calculations:
- `avg_price_7d`, `avg_price_30d`
- `min_price_7d`, `max_price_7d`
- `volume_7d`, `volume_30d` (listing count)
- `price_trend_7d`, `price_trend_30d` (%)
- `volume_trend_7d`
- `liquidity_score` (0-100)
- `volatility` (coefficient of variation)

### ✅ **Deal Score Formula**

```
Deal Score = (Price deviation × 0.4) +
             (Volume trend × 0.3) +
             (Liquidity × 0.2) +
             (Set popularity × 0.1)

Output: 0-100 (higher = better deal)
```

**Components:**
1. **Price Deviation (40%)**: How far below market average
2. **Volume Trend (30%)**: Growing/shrinking listing volume
3. **Liquidity (20%)**: Market liquidity based on listing count
4. **Popularity (10%)**: Set/product popularity score

### ✅ **Signal Types**

| Signal | Trigger | Level | Priority |
|--------|---------|-------|----------|
| **high_deal** | Deal score ≥ 80 | High | 10 |
| **medium_deal** | Deal score ≥ 60 | Medium | 5 |
| **undervalued** | Price ≥20% below avg | High | 8 |
| **momentum** | Price ↑10% + Volume ↑20% | Medium | 6 |
| **risk** | Volume ↓30% + Price ↑20% | High | 7 |
| **arbitrage** | Country diff ≥15% | Medium | 6 |

## Output Tables

### `market_statistics`
```sql
- product_name, product_set, category
- avg_price_7d, avg_price_30d
- min_price_7d, max_price_7d
- volume_7d, volume_30d
- price_trend_7d, price_trend_30d
- volume_trend_7d, volume_trend_30d
- liquidity_score, volatility
- sample_size, data_quality
- calculated_at
```

### `deal_scores`
```sql
- product_name, product_set, category
- current_price, market_avg_price
- price_deviation_score
- volume_trend_score
- liquidity_score
- popularity_score
- deal_score (composite 0-100)
- confidence, data_quality
- is_active, expires_at
- calculated_at
```

### `signals`
```sql
- signal_type, signal_level
- product_name, product_set
- current_price, market_avg_price
- deal_score, confidence
- description, metadata
- priority, is_active, is_sent
- detected_at, expires_at
```

## Usage

### Run Standalone

```bash
# Direct execution
docker compose exec analysis python run_analysis.py

# Background
docker compose exec -d analysis python run_analysis.py

# Check logs
docker compose logs analysis | grep -i "analysis complete"
```

### Setup Cron

```bash
# Edit crontab
crontab -e

# Run every 2 hours
0 */2 * * * cd /path/to/pokemon-market-intel && docker compose exec -T analysis python run_analysis.py >> /var/log/analysis.log 2>&1

# Run every 6 hours
0 */6 * * * cd /path/to/pokemon-market-intel && docker compose exec -T analysis python run_analysis.py >> /var/log/analysis.log 2>&1

# Run daily at 4 AM
0 4 * * * cd /path/to/pokemon-market-intel && docker compose exec -T analysis python run_analysis.py >> /var/log/analysis.log 2>&1
```

## Configuration

Edit `app/config_analysis.py`:

```python
# Time windows
SHORT_WINDOW_DAYS = 7
LONG_WINDOW_DAYS = 30

# Deal score weights (must sum to 1.0)
WEIGHT_PRICE_DEVIATION = 0.4
WEIGHT_VOLUME_TREND = 0.3
WEIGHT_LIQUIDITY = 0.2
WEIGHT_POPULARITY = 0.1

# Signal thresholds
DEAL_SCORE_HIGH = 80.0
DEAL_SCORE_MEDIUM = 60.0
PRICE_DEVIATION_UNDERVALUED = 20.0
MOMENTUM_PRICE_CHANGE = 10.0
MOMENTUM_VOLUME_CHANGE = 20.0
RISK_VOLUME_DROP = -30.0
RISK_PRICE_RISE = 20.0

# Liquidity thresholds
HIGH_LIQUIDITY_VOLUME = 100
MED_LIQUIDITY_VOLUME = 50
LOW_LIQUIDITY_VOLUME = 20

# Popular sets (0-100 scoring)
POPULAR_SETS = {
    'Base Set': 100.0,
    '151': 95.0,
    'Paldean Fates': 90.0,
    # ...
}
```

## Monitoring

### Check Results

```sql
-- Recent market stats
SELECT product_name, avg_price_7d, volume_7d, price_trend_7d
FROM market_statistics
WHERE calculated_at > NOW() - INTERVAL '1 day'
ORDER BY calculated_at DESC
LIMIT 20;

-- Top deal scores
SELECT product_name, current_price, deal_score, confidence
FROM deal_scores
WHERE is_active = true
  AND calculated_at > NOW() - INTERVAL '1 day'
ORDER BY deal_score DESC
LIMIT 20;

-- Active signals
SELECT signal_type, signal_level, product_name, description
FROM signals
WHERE is_active = true
  AND detected_at > NOW() - INTERVAL '1 day'
ORDER BY priority DESC, detected_at DESC
LIMIT 20;

-- Signal summary
SELECT 
    signal_type,
    signal_level,
    COUNT(*) as count
FROM signals
WHERE detected_at > NOW() - INTERVAL '1 day'
GROUP BY signal_type, signal_level
ORDER BY count DESC;
```

### View Logs

```bash
# Real-time
docker compose logs -f analysis

# Last run
tail -f /tmp/analysis.log

# Errors only
docker compose logs analysis | grep -i error
```

## Calculation Details

### Price Deviation Score

```python
deviation = ((market_avg - current_price) / market_avg) * 100

if deviation >= 50%:
    score = 100
elif deviation >= 0%:
    score = 50 + (deviation / 50) * 50
else:
    score = max(0, 50 + (deviation / 50) * 50)
```

### Volume Trend Score

```python
if volume_trend >= 100%:
    score = 100
elif volume_trend >= 0%:
    score = 50 + (volume_trend / 100) * 50
else:
    score = max(0, 50 + (volume_trend / 50) * 50)
```

### Liquidity Score

```python
if volume >= HIGH_LIQUIDITY (100):
    score = 100
elif volume >= MED_LIQUIDITY (50):
    score = 50 + linear_interpolation(50, 100)
elif volume >= LOW_LIQUIDITY (20):
    score = 20 + linear_interpolation(20, 50)
else:
    score = linear_interpolation(0, 20)
```

### Popularity Score

Based on predefined set ratings:
- Base Set: 100
- 151: 95
- Paldean Fates: 90
- Default: 50

## Error Handling

### Graceful Degradation
- Missing data → Skip product, continue
- Calculation errors → Log and continue
- Database errors → Rollback, log, raise

### Data Quality Checks
- Minimum sample sizes required
- Outlier detection and removal
- Quality scoring (excellent/good/fair/poor)
- Confidence scoring based on data quality

## Performance

### Expected Metrics
- **Processing Speed**: ~1000 products/minute
- **Memory Usage**: ~500-1000 MB
- **Duration**: 5-15 minutes (depends on data volume)
- **Database Impact**: Read-heavy, batch writes

### Optimization
- Batch processing (1000 records at a time)
- Pandas for efficient calculations
- Async database operations
- Connection pooling

## Troubleshooting

### No market stats generated
- Check raw_prices table has data
- Verify data is within 30-day window
- Check minimum sample size requirements

### Deal scores all 0 or 100
- Review weight configuration
- Check normalization is working
- Verify market stats are calculated

### No signals generated
- Ensure deal scores exist
- Check signal thresholds in config
- Verify market stats have trends

## File Structure

```
services/analysis/
├── app/
│   ├── models/
│   │   ├── market_stats.py         # Market statistics model
│   │   ├── deal_score.py           # Deal score model
│   │   ├── signal.py               # Signal model
│   │   └── raw_price.py            # Raw price reference
│   ├── calculators/
│   │   ├── market_stats_calculator.py   # Stats calculator
│   │   └── deal_score_calculator.py     # Deal score calculator
│   ├── generators/
│   │   └── signal_generator.py     # Signal generator
│   ├── normalizers/
│   │   └── data_normalizer.py      # Data normalization
│   ├── config_analysis.py          # Configuration
│   └── database.py                 # DB connection
├── run_analysis.py                 # Cron-ready entry point
└── ANALYSIS_README.md              # This file
```

## Integration

### With Scraper
- Reads from `raw_prices` table
- No direct coupling
- Works with any scraper data

### With Frontend/Backend
- Exposes `market_stats`, `deal_scores`, `signals` tables
- Frontend can query for dashboard
- Backend can trigger alerts (future)

## Future Enhancements

- [ ] Multi-currency support (beyond EUR)
- [ ] Country-specific arbitrage detection
- [ ] Machine learning price predictions
- [ ] Anomaly detection (fraud/manipulation)
- [ ] Historical trend analysis
- [ ] API endpoints for real-time queries

## Summary

**Complete analysis engine with:**
- ✅ Data normalization
- ✅ Market statistics (7d & 30d)
- ✅ Deal score calculation (0-100)
- ✅ Signal generation (6 types)
- ✅ Cron-ready execution
- ✅ Async operations
- ✅ Comprehensive logging
- ✅ Error handling
- ✅ Production-ready

**Ready to run and integrate!** 🚀
