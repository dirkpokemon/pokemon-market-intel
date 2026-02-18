# 🚀 Analysis Engine - Quick Start Guide

## ✅ Status: **PRODUCTION READY**

The analysis and deal score engine is fully implemented and operational.

## 🎯 What It Does

Transforms raw price data into actionable market intelligence:
- **Market Statistics**: 7d & 30d averages, trends, volume
- **Deal Scores**: 0-100 rating of how good a deal is
- **Signals**: Automated alerts for opportunities and risks

## ⚡ Quick Commands

### Run Analysis Once
```bash
docker compose exec analysis python run_analysis.py
```

### Check Service Status
```bash
docker compose ps analysis
docker compose logs -f analysis
```

### View Results
```bash
# Top 20 deals
docker compose exec postgres psql -U pokemon_user -d pokemon_intel -c \
  "SELECT product_name, deal_score, current_price FROM deal_scores WHERE is_active = true ORDER BY deal_score DESC LIMIT 20;"

# Active signals
docker compose exec postgres psql -U pokemon_user -d pokemon_intel -c \
  "SELECT signal_type, product_name, description FROM signals WHERE is_active = true ORDER BY priority DESC LIMIT 20;"

# Market stats
docker compose exec postgres psql -U pokemon_user -d pokemon_intel -c \
  "SELECT product_name, avg_price_7d, price_trend_7d FROM market_statistics ORDER BY calculated_at DESC LIMIT 20;"
```

## 📅 Setup Cron (Automated Runs)

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

## ⚙️ Configuration

Edit `services/analysis/app/config_analysis.py`:

```python
# Deal score weights
WEIGHT_PRICE_DEVIATION = 0.4  # How far below market avg
WEIGHT_VOLUME_TREND = 0.3     # Listing volume trend
WEIGHT_LIQUIDITY = 0.2        # Market liquidity
WEIGHT_POPULARITY = 0.1       # Set popularity

# Signal thresholds
DEAL_SCORE_HIGH = 80.0        # High alert threshold
DEAL_SCORE_MEDIUM = 60.0      # Medium alert threshold
PRICE_DEVIATION_UNDERVALUED = 20.0  # % below avg for "undervalued"
```

## 📊 Output Tables

### `market_statistics`
- `avg_price_7d`, `avg_price_30d`
- `volume_7d`, `volume_30d`
- `price_trend_7d`, `volume_trend_7d`
- `liquidity_score`, `volatility`

### `deal_scores`
- `deal_score` (0-100)
- `current_price`, `market_avg_price`
- `price_deviation_score`, `volume_trend_score`
- `liquidity_score`, `popularity_score`
- `confidence`, `data_quality`

### `signals`
- `signal_type`: high_deal, medium_deal, undervalued, momentum, risk, arbitrage
- `signal_level`: high, medium, low
- `description`, `priority`
- `is_active`, `is_sent`

## 🎯 Deal Score Formula

```
Deal Score = (Price deviation × 0.4) +
             (Volume trend × 0.3) +
             (Liquidity × 0.2) +
             (Set popularity × 0.1)

Output: 0-100 (higher = better deal)
```

## 🚨 Signal Types

| Signal | Trigger | Priority |
|--------|---------|----------|
| **high_deal** | Score ≥ 80 | 10 |
| **undervalued** | Price 20%+ below avg | 8 |
| **risk** | Volume ↓30% + Price ↑20% | 7 |
| **momentum** | Price ↑10% + Volume ↑20% | 6 |
| **arbitrage** | Country diff ≥ 15% | 6 |
| **medium_deal** | Score ≥ 60 | 5 |

## 🔍 Monitoring

### Check Pipeline Health
```bash
# View last run
docker compose logs analysis --tail 50

# Check for errors
docker compose logs analysis | grep -i error

# Real-time monitoring
docker compose logs -f analysis
```

### Verify Data
```bash
# Count records
docker compose exec postgres psql -U pokemon_user -d pokemon_intel -c \
  "SELECT 'market_stats' as table, COUNT(*) FROM market_statistics
   UNION ALL
   SELECT 'deal_scores', COUNT(*) FROM deal_scores
   UNION ALL
   SELECT 'signals', COUNT(*) FROM signals;"
```

## 📚 Documentation

- **`ANALYSIS_README.md`**: Full documentation
- **`IMPLEMENTATION_SUMMARY.md`**: Technical details
- **`ANALYSIS_COMPLETE.md`**: Completion summary

## 🐛 Troubleshooting

### No data generated?
```bash
# Check raw prices exist
docker compose exec postgres psql -U pokemon_user -d pokemon_intel -c \
  "SELECT COUNT(*) FROM raw_prices WHERE scraped_at > NOW() - INTERVAL '30 days';"

# Minimum 5 samples needed per product
```

### Service not running?
```bash
# Restart
docker compose restart analysis

# Check logs
docker compose logs analysis --tail 50
```

## ✅ Success Criteria

When analysis runs successfully:
1. Market stats calculated for each unique product
2. Deal scores generated for products with ≥5 samples
3. Signals created for high-scoring deals and trends
4. No errors in logs
5. Exit code 0

## 🚀 Next Steps

1. **Wait for Scraper Data**: Scraper populates `raw_prices`
2. **Run First Analysis**: Execute `run_analysis.py`
3. **Verify Results**: Query tables
4. **Setup Cron**: Automate runs
5. **Integrate with Frontend**: Display results in dashboard

---

**Analysis engine is operational and ready!** 🎉

For detailed documentation, see `ANALYSIS_README.md`
