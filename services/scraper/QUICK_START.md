# CardMarket Scraper - Quick Start Guide

## 🚀 How to Run the Scraper

### ✅ **Correct Commands**

```bash
# 1. Run CardMarket scraper (standalone)
docker compose exec scraper python run_cardmarket.py

# 2. Run in background
docker compose exec -d scraper python run_cardmarket.py

# 3. Run the main scraper service (all scrapers)
docker compose exec scraper python -m app.main
```

### ❌ **Common Mistakes**

```bash
# DON'T DO THIS - Wrong file path
docker compose run scraper python main.py
# Error: can't open file '/app/main.py'

# INSTEAD DO THIS - Correct path
docker compose exec scraper python -m app.main
# Or run CardMarket directly:
docker compose exec scraper python run_cardmarket.py
```

## 📋 **Command Reference**

| Command | Description | When to Use |
|---------|-------------|-------------|
| `docker compose exec scraper python run_cardmarket.py` | Run CardMarket scraper only | Testing CardMarket specifically |
| `docker compose exec scraper python -m app.main` | Run all scrapers (scheduled) | Normal operations |
| `docker compose logs -f scraper` | View logs live | Monitoring |
| `docker compose restart scraper` | Restart service | After code changes |
| `docker compose up -d --build scraper` | Rebuild & restart | After major changes |
| `docker compose ps` | Check service status | Verify running |

## 🔧 **Common Tasks**

### Run CardMarket Scraper
```bash
cd /Users/shelleybello/pokemon-market-intel
docker compose exec scraper python run_cardmarket.py
```

### View Logs
```bash
# Real-time logs
docker compose logs -f scraper

# Last 50 lines
docker compose logs --tail=50 scraper

# CardMarket specific
docker compose logs scraper | grep -i cardmarket

# Errors only
docker compose logs scraper | grep -i error
```

### Check Database
```bash
# Connect to database
docker compose exec postgres psql -U pokemon_user -d pokemon_intel

# View recent scrapes
docker compose exec postgres psql -U pokemon_user -d pokemon_intel -c "
SELECT COUNT(*) as total, MAX(scraped_at) as last_scrape 
FROM raw_prices 
WHERE source = 'CardMarket';
"
```

### Rebuild After Changes
```bash
# After editing code
docker compose up -d --build scraper

# Or
docker compose build scraper
docker compose restart scraper
```

### Clean Up
```bash
# Remove orphan containers
docker compose down --remove-orphans

# Restart everything
docker compose up -d
```

## 📊 **Service Architecture**

```
Your System
├── Main Scraper Service (automatic, scheduled)
│   └── docker compose exec scraper python -m app.main
│       ├── Runs CardMarket scraper
│       ├── Runs CardTrader scraper
│       └── Scheduled every 60 minutes
│
└── CardMarket Scraper (manual, on-demand)
    └── docker compose exec scraper python run_cardmarket.py
        ├── Runs immediately
        ├── Exit code 0 = success
        └── Cron-ready
```

## 🕐 **Setup Cron (Optional)**

For automatic daily scraping:

```bash
# Edit crontab
crontab -e

# Add this line for daily 3 AM scrape
0 3 * * * cd /Users/shelleybello/pokemon-market-intel && docker compose exec -T scraper python run_cardmarket.py >> /var/log/cardmarket.log 2>&1

# Or every 6 hours
0 */6 * * * cd /Users/shelleybello/pokemon-market-intel && docker compose exec -T scraper python run_cardmarket.py >> /var/log/cardmarket.log 2>&1
```

## 🐛 **Troubleshooting**

### "can't open file '/app/main.py'"
**Problem**: Wrong command syntax  
**Solution**: Use `python -m app.main` or `python run_cardmarket.py`

### "Container not found"
**Problem**: Services not running  
**Solution**: `docker compose up -d`

### "Orphan containers"
**Problem**: Old containers from failed runs  
**Solution**: `docker compose down --remove-orphans`

### "No data scraped"
**Problem**: CSS selectors need updating  
**Solution**: Inspect CardMarket HTML and update selectors in `cardmarket_production.py`

### "403 Forbidden"
**Problem**: CardMarket blocking requests  
**Solution**: 
1. Enable proxy: `CARDMARKET_USE_PROXY=true`
2. Increase delays: `CARDMARKET_MIN_DELAY_SECONDS=5.0`
3. Add real proxy URL

## 📝 **File Locations**

```
/Users/shelleybello/pokemon-market-intel/services/scraper/
├── run_cardmarket.py              # ← Standalone entry point
├── app/main.py                    # ← Main service orchestrator
├── app/scrapers/
│   └── cardmarket_production.py   # ← CardMarket scraper logic
├── app/config_cardmarket.py       # ← Configuration
└── CARDMARKET_README.md           # ← Full documentation
```

## ✅ **Quick Test**

```bash
# 1. Check services are running
docker compose ps

# 2. Run CardMarket scraper
docker compose exec scraper python run_cardmarket.py

# 3. Check logs
docker compose logs --tail=20 scraper

# 4. Verify in database
docker compose exec postgres psql -U pokemon_user -d pokemon_intel -c "
SELECT COUNT(*) FROM raw_prices WHERE source = 'CardMarket';
"
```

## 📚 **Full Documentation**

- **Quick Start**: This file
- **Full Guide**: `CARDMARKET_README.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`
- **Code**: `app/scrapers/cardmarket_production.py`

---

**Need help?** Check the full documentation in `CARDMARKET_README.md`
