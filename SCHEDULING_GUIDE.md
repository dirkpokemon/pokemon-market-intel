# 🕐 Automated Scraping Schedule - Complete Guide

## 📋 Quick Start

To set up automated daily scrapes, run:

```bash
cd /Users/shelleybello/pokemon-market-intel
./setup_cron.sh
```

That's it! Your scrapers will now run automatically.

---

## 📅 Recommended Schedule

### **What Gets Scheduled:**

| Task | Frequency | Time | Duration | Purpose |
|------|-----------|------|----------|---------|
| **CardTrader** | Daily | 2:00 AM | ~40 min | Full market refresh (171K+ listings) |
| **CardMarket** | Hourly | Every hour | ~5 min | Active market updates |
| **Analysis Engine** | Every 2 hours | Even hours | ~5 min | Calculate deal scores & signals |
| **Log Cleanup** | Daily | 1:00 AM | <1 min | Remove old logs (>30 days) |
| **DB Optimize** | Weekly | Sun 3 AM | ~2 min | Database maintenance |

---

## 🎯 Why This Schedule?

### **CardTrader - Daily at 2 AM:**
- ✅ Off-peak hours (low server load)
- ✅ Complete before morning trading
- ✅ Fresh data for European users
- ✅ 171K+ listings in one scrape
- ✅ 40-minute runtime won't impact other tasks

### **CardMarket - Every Hour:**
- ✅ Most active EU marketplace
- ✅ Prices change frequently
- ✅ Quick scrapes (~5 minutes)
- ✅ Real-time market tracking
- ✅ Feeds into hourly analysis

### **Analysis Engine - Every 2 Hours:**
- ✅ Processes new scrape data
- ✅ Updates deal scores
- ✅ Generates fresh signals
- ✅ Triggers alerts for paid users
- ✅ Keeps dashboard current

---

## 🚀 Installation

### **Method 1: Automated Setup (Recommended)**

```bash
cd /Users/shelleybello/pokemon-market-intel
./setup_cron.sh
```

Follow the prompts. This will:
1. Create log directories
2. Set up all cron jobs
3. Backup your existing crontab
4. Display the installed schedule

### **Method 2: Manual Installation**

```bash
# Edit your crontab
crontab -e

# Add these lines:
0 2 * * * cd /Users/shelleybello/pokemon-market-intel && docker compose exec -T scraper python run_cardtrader.py >> ~/pokemon-intel-logs/cardtrader.log 2>&1
0 * * * * cd /Users/shelleybello/pokemon-market-intel && docker compose exec -T scraper python run_cardmarket.py >> ~/pokemon-intel-logs/cardmarket.log 2>&1
0 */2 * * * cd /Users/shelleybello/pokemon-market-intel && docker compose exec -T analysis python run_analysis.py >> ~/pokemon-intel-logs/analysis.log 2>&1
```

---

## 📊 Monitoring Your Scheduled Scrapes

### **Check Cron Jobs:**

```bash
# View all scheduled jobs
crontab -l

# Check if cron service is running (macOS)
sudo launchctl list | grep cron
```

### **Monitor Logs:**

```bash
# Watch CardTrader scrapes
tail -f ~/pokemon-intel-logs/cardtrader.log

# Watch CardMarket scrapes
tail -f ~/pokemon-intel-logs/cardmarket.log

# Watch Analysis runs
tail -f ~/pokemon-intel-logs/analysis.log

# View all recent activity
ls -lht ~/pokemon-intel-logs/
```

### **Check Last Run Status:**

```bash
# See when scrapers last ran
ls -lh ~/pokemon-intel-logs/*.log

# Check last 20 lines of each log
tail -20 ~/pokemon-intel-logs/cardtrader.log
tail -20 ~/pokemon-intel-logs/cardmarket.log
tail -20 ~/pokemon-intel-logs/analysis.log
```

---

## 🔧 Customizing Your Schedule

### **Option 1: Change Frequency**

Edit the cron times in `setup_cron.sh` before running:

```bash
# CardTrader - Change from daily to every 12 hours
0 2,14 * * * cd /path && docker compose exec -T scraper python run_cardtrader.py

# CardMarket - Change from hourly to every 30 minutes
*/30 * * * * cd /path && docker compose exec -T scraper python run_cardmarket.py

# Analysis - Change from 2 hours to every hour
0 * * * * cd /path && docker compose exec -T analysis python run_analysis.py
```

### **Option 2: Different Times**

```bash
# CardTrader at midnight instead of 2 AM
0 0 * * * cd /path && docker compose exec -T scraper python run_cardtrader.py

# CardTrader twice daily (morning & evening)
0 6,18 * * * cd /path && docker compose exec -T scraper python run_cardtrader.py

# Analysis only during business hours (9 AM - 6 PM)
0 9-18/2 * * * cd /path && docker compose exec -T analysis python run_analysis.py
```

### **Option 3: Weekday-Only Scraping**

```bash
# CardTrader - Weekdays only (Monday-Friday)
0 2 * * 1-5 cd /path && docker compose exec -T scraper python run_cardtrader.py

# CardMarket - Business hours on weekdays
0 9-17 * * 1-5 cd /path && docker compose exec -T scraper python run_cardmarket.py
```

---

## 📈 Performance Optimization

### **Light Schedule (Low Resource Usage):**

```bash
# CardTrader - Once per day
0 2 * * * # Daily at 2 AM

# CardMarket - Every 4 hours
0 */4 * * * # 6 times per day

# Analysis - Every 6 hours
0 */6 * * * # 4 times per day
```

**Pros**: Low CPU/network usage, minimal cost
**Cons**: Less frequent data updates

### **Balanced Schedule (Recommended):**

```bash
# CardTrader - Once per day
0 2 * * * # Daily at 2 AM

# CardMarket - Hourly
0 * * * * # 24 times per day

# Analysis - Every 2 hours
0 */2 * * * # 12 times per day
```

**Pros**: Good balance of freshness and efficiency
**Cons**: None, this is optimal for most use cases

### **Aggressive Schedule (Maximum Freshness):**

```bash
# CardTrader - Twice per day
0 2,14 * * * # 2 times per day

# CardMarket - Every 30 minutes
*/30 * * * * # 48 times per day

# Analysis - Every hour
0 * * * * # 24 times per day
```

**Pros**: Maximum data freshness, best for high-frequency trading
**Cons**: Higher resource usage, more API calls

---

## 🛠️ Troubleshooting

### **Cron Jobs Not Running:**

```bash
# Check if cron is enabled (macOS)
sudo launchctl list | grep cron

# Enable cron if needed (macOS)
sudo launchctl load -w /System/Library/LaunchDaemons/com.vixie.cron.plist

# Check system logs
tail -f /var/log/system.log | grep cron
```

### **Docker Not Found:**

Make sure Docker is in your PATH:

```bash
# Add to crontab at the top
PATH=/usr/local/bin:/usr/bin:/bin

# Or use full path
0 2 * * * cd /path && /usr/local/bin/docker compose exec -T scraper python run_cardtrader.py
```

### **Permission Errors:**

```bash
# Ensure scripts are executable
chmod +x /Users/shelleybello/pokemon-market-intel/setup_cron.sh

# Ensure log directory is writable
mkdir -p ~/pokemon-intel-logs
chmod 755 ~/pokemon-intel-logs
```

### **Scraper Fails to Run:**

```bash
# Test manually first
cd /Users/shelleybello/pokemon-market-intel
docker compose exec -T scraper python run_cardtrader.py

# Check Docker is running
docker compose ps

# Check container logs
docker compose logs scraper
```

---

## 📧 Email Notifications (Optional)

Get notified when scrapes complete or fail:

```bash
# Add to crontab (requires mail setup)
MAILTO=your-email@example.com

0 2 * * * cd /path && docker compose exec -T scraper python run_cardtrader.py >> ~/pokemon-intel-logs/cardtrader.log 2>&1 || echo "CardTrader scrape failed!"
```

Or use a monitoring service like:
- **Cronitor** (https://cronitor.io)
- **Healthchecks.io** (https://healthchecks.io)
- **Uptime Robot** (https://uptimerobot.com)

---

## 🗑️ Managing Logs

### **Log Rotation:**

Your setup includes automatic log cleanup (30-day retention):

```bash
# This runs daily at 1 AM
0 1 * * * find ~/pokemon-intel-logs -name "*.log" -type f -mtime +30 -delete
```

### **Manual Log Management:**

```bash
# View log sizes
du -sh ~/pokemon-intel-logs/*.log

# Archive old logs
tar -czf ~/pokemon-logs-$(date +%Y%m).tar.gz ~/pokemon-intel-logs/*.log
mv ~/pokemon-logs-*.tar.gz ~/pokemon-logs-archive/

# Clear logs manually
> ~/pokemon-intel-logs/cardtrader.log
> ~/pokemon-intel-logs/cardmarket.log
> ~/pokemon-intel-logs/analysis.log
```

---

## 📊 Monitoring Dashboard

### **Create a Status Script:**

```bash
#!/bin/bash
# status.sh - Check scraper status

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          Pokemon Market Intel - Status Check             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "📅 Last CardTrader Run:"
tail -5 ~/pokemon-intel-logs/cardtrader.log | grep -E "(Scrape complete|listings)"

echo ""
echo "📅 Last CardMarket Run:"
tail -5 ~/pokemon-intel-logs/cardmarket.log | grep -E "(Completed|items)"

echo ""
echo "📅 Last Analysis Run:"
tail -5 ~/pokemon-intel-logs/analysis.log | grep -E "(Analysis complete|signals)"

echo ""
echo "🗄️  Database Stats:"
docker compose exec -T db psql -U pokemon_intel -d pokemon_intel -c "
SELECT 
    source, 
    COUNT(*) as listings,
    MAX(scraped_at) as last_scraped
FROM raw_prices 
GROUP BY source;
"
```

Make it executable:
```bash
chmod +x status.sh
./status.sh
```

---

## 🎯 Best Practices

### **Do:**
- ✅ Start with the recommended schedule
- ✅ Monitor logs for the first week
- ✅ Adjust frequency based on your needs
- ✅ Set up log rotation
- ✅ Test manually before scheduling
- ✅ Keep Docker running 24/7
- ✅ Monitor disk space regularly

### **Don't:**
- ❌ Scrape too frequently (respect APIs)
- ❌ Run multiple scrapers simultaneously
- ❌ Ignore error logs
- ❌ Let logs grow infinitely
- ❌ Skip database maintenance
- ❌ Forget to test after changes

---

## 🆘 Quick Reference

### **View Schedule:**
```bash
crontab -l
```

### **Edit Schedule:**
```bash
crontab -e
```

### **Remove Schedule:**
```bash
crontab -r
```

### **Test Scraper Manually:**
```bash
cd /Users/shelleybello/pokemon-market-intel
docker compose exec scraper python run_cardtrader.py
```

### **Check Logs:**
```bash
tail -f ~/pokemon-intel-logs/cardtrader.log
```

### **Database Status:**
```bash
docker compose exec db psql -U pokemon_intel -d pokemon_intel -c \
  "SELECT source, COUNT(*), MAX(scraped_at) FROM raw_prices GROUP BY source;"
```

---

## ✅ Verification Checklist

After setting up cron jobs:

- [ ] Cron jobs installed: `crontab -l`
- [ ] Log directory exists: `ls ~/pokemon-intel-logs`
- [ ] Docker is running: `docker compose ps`
- [ ] Containers are healthy: `docker compose ps scraper`
- [ ] Manual test successful: `docker compose exec scraper python run_cardtrader.py`
- [ ] Logs are being written: `ls -lh ~/pokemon-intel-logs/*.log`
- [ ] Alert engine is running: `docker compose ps alerts`
- [ ] Database is accessible: `docker compose exec db psql -U pokemon_intel -l`

---

## 🎊 You're All Set!

Your Pokemon Market Intelligence platform now has:

✅ **Automated data collection**
- CardTrader: Daily full scrapes
- CardMarket: Hourly updates
- Analysis: Every 2 hours

✅ **Maintenance**
- Log cleanup: Daily
- Database optimization: Weekly

✅ **Monitoring**
- Logs in `~/pokemon-intel-logs/`
- Status check script
- Cron job tracking

**Your platform is now fully automated and production-ready!** 🚀

