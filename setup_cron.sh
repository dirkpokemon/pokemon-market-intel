#!/bin/bash
# Pokemon Market Intelligence - Automated Scraping Setup
# This script sets up cron jobs for automated data collection

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║    🕐 Setting Up Automated Scraping Schedule             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Get the absolute path to the project
PROJECT_PATH="/Users/shelleybello/pokemon-market-intel"
LOG_PATH="$HOME/pokemon-intel-logs"

# Create log directory if it doesn't exist
mkdir -p "$LOG_PATH"

echo "📁 Project path: $PROJECT_PATH"
echo "📝 Logs will be saved to: $LOG_PATH"
echo ""

# Create the crontab entries
CRON_FILE="/tmp/pokemon_intel_cron.txt"

cat > "$CRON_FILE" << EOF
# Pokemon Market Intelligence - Automated Scraping Schedule
# Generated on $(date)

# ============================================================
# CARDTRADER SCRAPER - Daily at 2 AM
# Full scrape of 100 expansions (~40 minutes)
# ============================================================
0 2 * * * cd $PROJECT_PATH && docker compose exec -T scraper python run_cardtrader.py >> $LOG_PATH/cardtrader.log 2>&1

# ============================================================
# CARDMARKET SCRAPER - Every hour
# Quick scrape of popular sets
# ============================================================
0 * * * * cd $PROJECT_PATH && docker compose exec -T scraper python run_cardmarket.py >> $LOG_PATH/cardmarket.log 2>&1

# ============================================================
# ANALYSIS ENGINE - Every 2 hours
# Calculate deal scores and generate signals
# ============================================================
0 */2 * * * cd $PROJECT_PATH && docker compose exec -T analysis python run_analysis.py >> $LOG_PATH/analysis.log 2>&1

# ============================================================
# DATABASE CLEANUP - Weekly on Sunday at 3 AM
# Clean old logs and optimize database (optional)
# ============================================================
0 3 * * 0 cd $PROJECT_PATH && docker compose exec -T db vacuumdb -U pokemon_intel -d pokemon_intel >> $LOG_PATH/maintenance.log 2>&1

# ============================================================
# LOG ROTATION - Daily at 1 AM
# Keep logs from growing too large
# ============================================================
0 1 * * * find $LOG_PATH -name "*.log" -type f -mtime +30 -delete

EOF

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PROPOSED SCHEDULE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
cat "$CRON_FILE" | grep -v "^#" | grep -v "^$"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📅 SCHEDULE BREAKDOWN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   🌙 2:00 AM  - CardTrader full scrape (daily)"
echo "   ⏰ Every hour - CardMarket quick scrape"
echo "   📊 Every 2h  - Analysis engine (deal scores)"
echo "   🗑️  1:00 AM  - Log cleanup (daily)"
echo "   🔧 3:00 AM  - Database optimization (weekly)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Do you want to install this cron schedule? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Backup existing crontab
    crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null || echo "No existing crontab to backup"
    
    # Add new cron jobs (append to existing)
    (crontab -l 2>/dev/null; cat "$CRON_FILE") | crontab -
    
    echo "✅ Cron jobs installed successfully!"
    echo ""
    echo "📋 Current crontab:"
    crontab -l
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ SETUP COMPLETE!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Your scrapers will now run automatically:"
    echo ""
    echo "   • CardTrader: Daily at 2 AM"
    echo "   • CardMarket: Every hour"
    echo "   • Analysis: Every 2 hours"
    echo ""
    echo "📊 Monitor logs:"
    echo "   tail -f $LOG_PATH/cardtrader.log"
    echo "   tail -f $LOG_PATH/cardmarket.log"
    echo "   tail -f $LOG_PATH/analysis.log"
    echo ""
else
    echo "❌ Installation cancelled."
    echo ""
    echo "💡 To manually install later, run:"
    echo "   bash setup_cron.sh"
fi

# Cleanup
rm -f "$CRON_FILE"
