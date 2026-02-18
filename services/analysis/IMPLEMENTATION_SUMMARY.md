# Analysis & Deal Score Engine - Implementation Summary

## 📦 What Was Implemented

A **production-ready analysis engine** that processes raw Pokémon price data to generate market intelligence, deal scores, and automated signals.

## 🏗️ Architecture

### Input
- `raw_prices` table (from scraper service)

### Processing Pipeline
1. **Data Normalization** → Clean and standardize data
2. **Market Statistics** → Calculate trends and metrics
3. **Deal Score Calculation** → Score deals 0-100
4. **Signal Generation** → Detect opportunities and risks

### Output
- `market_statistics` table
- `deal_scores` table
- `signals` table

## 📁 File Structure

```
services/analysis/
├── app/
│   ├── models/
│   │   ├── __init__.py
│   │   ├── market_stats.py          ✅ Market statistics model
│   │   ├── deal_score.py            ✅ Deal score model
│   │   ├── signal.py                ✅ Signal/alert model
│   │   └── raw_price.py             ✅ Raw price reference model
│   │
│   ├── normalizers/
│   │   ├── __init__.py              ✅
│   │   └── data_normalizer.py       ✅ Currency, condition, name normalization
│   │
│   ├── calculators/
│   │   ├── __init__.py              ✅
│   │   ├── market_stats_calculator.py   ✅ 7d/30d stats, trends
│   │   └── deal_score_calculator.py     ✅ Weighted scoring formula
│   │
│   ├── generators/
│   │   ├── __init__.py              ✅
│   │   └── signal_generator.py      ✅ 6 signal types
│   │
│   ├── config_analysis.py           ✅ All thresholds and weights
│   ├── config.py                    ✅ (existing)
│   ├── database.py                  ✅ (existing)
│   └── main.py                      ✅ (existing service orchestrator)
│
├── run_analysis.py                  ✅ Cron-ready entry point
├── ANALYSIS_README.md               ✅ Complete documentation
├── IMPLEMENTATION_SUMMARY.md        ✅ This file
├── Dockerfile                       ✅ (existing)
├── requirements.txt                 ✅ (existing + pandas, numpy)
└── .env.example                     ✅ (existing)
```

## 🎯 Features Implemented

### ✅ Data Normalization
- **Currency conversion** to EUR (5 currencies supported)
- **Condition standardization** (NM, LP, MP, HP, PO, DM)
- **Product name cleaning** for consistent grouping
- **Set name normalization** with common variations
- **Outlier detection** using z-score method
- **Quality scoring** based on sample size

### ✅ Market Statistics
Per product calculations:
- Average price (7-day and 30-day)
- Min/max prices
- Volume (listing count)
- Price trends (%)
- Volume trends (%)
- Liquidity score (0-100)
- Volatility (coefficient of variation)
- Data quality assessment

### ✅ Deal Score Calculation
**Formula:**
```
Deal Score = (Price deviation × 0.4) +
             (Volume trend × 0.3) +
             (Liquidity × 0.2) +
             (Set popularity × 0.1)
```

**Components:**
1. **Price Deviation (40%)**: How far below market average
2. **Volume Trend (30%)**: Increasing/decreasing listings
3. **Liquidity (20%)**: Market depth based on volume
4. **Popularity (10%)**: Set prestige/demand

**Output:** 0-100 score (higher = better deal)

### ✅ Signal Generation
Six signal types:

| Signal | Trigger | Level | Priority |
|--------|---------|-------|----------|
| `high_deal` | Score ≥ 80 | High | 10 |
| `medium_deal` | Score ≥ 60 | Medium | 5 |
| `undervalued` | Price ≥ 20% below avg | High | 8 |
| `momentum` | Price ↑10% + Volume ↑20% | Medium | 6 |
| `risk` | Volume ↓30% + Price ↑20% | High | 7 |
| `arbitrage` | Country diff ≥ 15% | Medium | 6 |

### ✅ Operational Features
- **Async/await** throughout
- **Batch processing** (1000 records)
- **Comprehensive logging** with context
- **Graceful error handling**
- **Cron-ready** standalone script
- **Database migrations** ready
- **Configurable thresholds**

## 🔧 Configuration

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

# Liquidity levels
HIGH_LIQUIDITY_VOLUME = 100
MED_LIQUIDITY_VOLUME = 50
LOW_LIQUIDITY_VOLUME = 20

# Popular sets
POPULAR_SETS = {
    'Base Set': 100.0,
    '151': 95.0,
    'Paldean Fates': 90.0,
}
```

## 🚀 Usage

### Run Analysis Engine

```bash
# Direct execution
docker compose exec analysis python run_analysis.py

# Background
docker compose exec -d analysis python run_analysis.py

# View logs
docker compose logs -f analysis
```

### Setup Cron (Every 2 Hours)

```bash
crontab -e

# Add:
0 */2 * * * cd /path/to/pokemon-market-intel && docker compose exec -T analysis python run_analysis.py >> /var/log/analysis.log 2>&1
```

### Query Results

```sql
-- Top deals
SELECT product_name, current_price, deal_score, confidence
FROM deal_scores
WHERE is_active = true
ORDER BY deal_score DESC
LIMIT 20;

-- Active signals
SELECT signal_type, signal_level, product_name, description
FROM signals
WHERE is_active = true
ORDER BY priority DESC, detected_at DESC;

-- Market trends
SELECT product_name, avg_price_7d, price_trend_7d, volume_7d
FROM market_statistics
ORDER BY calculated_at DESC
LIMIT 20;
```

## 🎨 Database Schema

### market_statistics
```sql
CREATE TABLE market_statistics (
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
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_product_name_calculated ON market_statistics(product_name, calculated_at);
```

### deal_scores
```sql
CREATE TABLE deal_scores (
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
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deal_score_active ON deal_scores(deal_score, is_active);
```

### signals
```sql
CREATE TABLE signals (
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
    metadata TEXT,
    
    confidence NUMERIC(5,2),
    priority INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_signal_type_level ON signals(signal_type, signal_level);
CREATE INDEX idx_signal_active ON signals(is_active, detected_at);
```

## 📊 Data Flow

```
1. Scraper Service
   └─> Writes to: raw_prices

2. Analysis Service (This)
   ├─> Reads from: raw_prices
   └─> Writes to:
       ├─> market_statistics
       ├─> deal_scores
       └─> signals

3. Backend API (Future)
   ├─> Reads from: market_statistics, deal_scores, signals
   └─> Exposes: REST API endpoints

4. Frontend (Future)
   └─> Queries: Backend API
       └─> Displays: Dashboard, charts, alerts
```

## ✅ Production Checklist

- [x] Data normalization (currency, condition, names)
- [x] Market statistics (7d & 30d)
- [x] Deal score calculation (weighted formula)
- [x] Signal generation (6 types)
- [x] Database models with proper indexes
- [x] Async operations throughout
- [x] Comprehensive error handling
- [x] Structured logging
- [x] Cron-ready entry point
- [x] Configuration management
- [x] Documentation

## 🔬 Testing

### Manual Test

```bash
# Run analysis once
docker compose exec analysis python run_analysis.py

# Check output
docker compose exec postgres psql -U pokemon_user -d pokemon_market_intel -c \
  "SELECT COUNT(*) FROM market_statistics;"

docker compose exec postgres psql -U pokemon_user -d pokemon_market_intel -c \
  "SELECT COUNT(*) FROM deal_scores WHERE is_active = true;"

docker compose exec postgres psql -U pokemon_user -d pokemon_market_intel -c \
  "SELECT signal_type, COUNT(*) FROM signals WHERE is_active = true GROUP BY signal_type;"
```

### Expected Results
- Market stats created for each unique product
- Deal scores calculated for products with sufficient data
- Signals generated for high-scoring deals and trends

## 🐛 Troubleshooting

### No data generated
```bash
# Check if raw_prices has data
docker compose exec postgres psql -U pokemon_user -d pokemon_market_intel -c \
  "SELECT COUNT(*) FROM raw_prices WHERE scraped_at > NOW() - INTERVAL '30 days';"
```

### Check logs
```bash
docker compose logs analysis | tail -50
```

### Run database migrations
```bash
docker compose exec analysis alembic revision --autogenerate -m "Add analysis tables"
docker compose exec analysis alembic upgrade head
```

## 🚀 Next Steps

### Integration
1. **Backend API**: Create REST endpoints to expose deal scores and signals
2. **Frontend Dashboard**: Display market stats and alerts
3. **Alert System**: Email/webhook notifications for high-priority signals
4. **Real-time Updates**: WebSocket for live deal updates

### Enhancements
- [ ] Machine learning for price predictions
- [ ] Anomaly detection (fraud/manipulation)
- [ ] Historical trend analysis
- [ ] Multi-currency support beyond EUR
- [ ] Advanced arbitrage detection (multi-country)

## 📝 Summary

**Complete implementation of:**
- ✅ 3 database models
- ✅ Data normalization engine
- ✅ Market statistics calculator
- ✅ Deal score calculator (weighted formula)
- ✅ Signal generator (6 types)
- ✅ Cron-ready entry point
- ✅ Comprehensive documentation
- ✅ Production-ready code

**Ready to analyze and score Pokemon card deals!** 🎯
