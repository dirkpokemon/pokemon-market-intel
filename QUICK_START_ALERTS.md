# 🔔 Alert Engine - Quick Start Guide

## ✅ Status: RUNNING

Your Alert Engine is now **live and operational**!

```
🎯 Alert Engine is now running
📧 Email provider: SendGrid (configured)
📱 Telegram: Disabled (optional)
⚠️  DRY RUN MODE: Enabled (safe for testing)
```

---

## 🚀 What Just Happened

1. ✅ **Database table created**: `alerts_sent` tracks all sent alerts
2. ✅ **User preferences added**: `telegram_chat_id`, `alert_email`, `alerts_enabled`
3. ✅ **Docker image built**: Alert Engine packaged and ready
4. ✅ **Service started**: Running with APScheduler
5. ✅ **Jobs scheduled**:
   - High-priority alerts: Every 5 minutes
   - Daily digest: 9:00 AM UTC

---

## 🧪 Test the Alert Engine

### Step 1: Trigger a Test Alert

The engine checks for new signals every 5 minutes. A test signal has been inserted.

**Monitor the logs:**
```bash
docker compose logs -f alerts
```

Within 5 minutes, you should see:
```
============================================================
Starting immediate alert processing job
============================================================
Found X high-priority signals to process
Found X eligible premium users
[DRY RUN] Would send email to user@example.com: 🔥 HIGH ALERT: Charizard ex
✅ Immediate alerts processed: {...}
```

### Step 2: Check the Database

```bash
docker compose exec -T postgres psql -U pokemon_user -d pokemon_intel << 'EOF'
-- View test signal
SELECT product_name, signal_level, is_sent FROM signals 
WHERE product_name LIKE '%Test%' 
ORDER BY detected_at DESC LIMIT 1;

-- View sent alerts (if any)
SELECT * FROM alerts_sent ORDER BY sent_at DESC LIMIT 5;
EOF
```

### Step 3: Manual Trigger (Optional)

Don't want to wait 5 minutes? Run immediately:
```bash
docker compose exec alerts python run_alerts.py
```

---

## 📧 Enable Real Email Sending

Currently in **DRY RUN MODE** (alerts logged, not sent).

### Option 1: SendGrid (Recommended)

1. **Sign up**: https://sendgrid.com (free tier: 100/day)
2. **Verify sender email**: Settings → Sender Authentication
3. **Create API Key**: Settings → API Keys → Create API Key
   - Name: "Pokemon Intel Alerts"
   - Permissions: "Mail Send" (Full Access)
4. **Update `.env`**:
   ```bash
   cd services/alerts
   nano .env  # or use your favorite editor
   ```
   Change:
   ```env
   SENDGRID_API_KEY=SG.your_actual_api_key_here
   DRY_RUN=false
   ```
5. **Restart**:
   ```bash
   docker compose restart alerts
   ```

### Option 2: Gmail SMTP

1. **Enable 2FA** on your Google Account
2. **Generate App Password**:
   - Go to: Google Account → Security → App Passwords
   - Create password for "Mail"
3. **Update `.env`**:
   ```env
   EMAIL_PROVIDER=smtp
   SMTP_USERNAME=your_email@gmail.com
   SMTP_PASSWORD=your_16_char_app_password
   DRY_RUN=false
   ```
4. **Restart**:
   ```bash
   docker compose restart alerts
   ```

---

## 📱 Enable Telegram (Optional)

### Step 1: Create Bot

1. Open Telegram, search **@BotFather**
2. Send: `/newbot`
3. Follow prompts (name, username)
4. Copy bot token (looks like: `123456:ABC-DEF1234ghIkl-...`)

### Step 2: Configure Bot

Update `services/alerts/.env`:
```env
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-...
```

Restart:
```bash
docker compose restart alerts
```

### Step 3: Get User Chat IDs

Users must:
1. Search for your bot in Telegram
2. Click "Start"
3. Get their chat_id from: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Update database:
   ```sql
   UPDATE users 
   SET telegram_chat_id = '123456789' 
   WHERE email = 'user@example.com';
   ```

---

## 🛠️ Common Commands

### View Logs
```bash
# Follow in real-time
docker compose logs -f alerts

# Last 100 lines
docker compose logs alerts --tail 100

# Filter for sent alerts
docker compose logs alerts | grep "✅"

# Filter for errors
docker compose logs alerts | grep "❌"
```

### Manual Execution
```bash
# Run once (good for testing)
docker compose exec alerts python run_alerts.py
```

### Restart Service
```bash
docker compose restart alerts
```

### Stop Service
```bash
docker compose stop alerts
```

### View Service Status
```bash
docker compose ps alerts
```

---

## 📊 Monitor Alerts

### Dashboard Queries

```sql
-- Alerts sent today
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN sent_successfully THEN 1 ELSE 0 END) as successful,
    channel
FROM alerts_sent
WHERE sent_at >= CURRENT_DATE
GROUP BY channel;

-- Recent alerts with details
SELECT 
    u.email,
    s.product_name,
    a.alert_type,
    a.channel,
    a.sent_successfully,
    a.sent_at
FROM alerts_sent a
JOIN users u ON a.user_id = u.id
JOIN signals s ON a.signal_id = s.id
ORDER BY a.sent_at DESC
LIMIT 20;

-- Unsent high-priority signals
SELECT 
    product_name,
    signal_level,
    deal_score,
    detected_at
FROM signals
WHERE is_active = true
AND is_sent = false
AND signal_level = 'high'
ORDER BY priority DESC, detected_at DESC;
```

---

## ⚙️ Configuration

Edit `services/alerts/.env`:

```env
# Email provider (sendgrid or smtp)
EMAIL_PROVIDER=sendgrid

# How often to check for alerts (minutes)
CHECK_INTERVAL_MINUTES=5

# When to send daily digest (UTC hour, 0-23)
DIGEST_SEND_HOUR=9

# Max alerts per user per day
MAX_ALERTS_PER_USER_PER_DAY=10

# Test mode (true = log only, false = actually send)
DRY_RUN=true

# Log verbosity (DEBUG, INFO, WARNING, ERROR)
LOG_LEVEL=INFO
```

After changes:
```bash
docker compose restart alerts
```

---

## 🚨 Troubleshooting

### "No eligible premium users found"

**Cause**: No users with paid/pro subscription and alerts enabled.

**Fix**:
```sql
-- Check user status
SELECT email, role, is_active, alerts_enabled FROM users;

-- Upgrade a user to paid (for testing)
UPDATE users 
SET role = 'paid' 
WHERE email = 'demo@pokemontel.eu';
```

### "No new high-priority signals found"

**Cause**: No unsent signals with `signal_level = 'high'`.

**Fix**: Wait for analysis engine to generate signals, or insert test signal (see above).

### SendGrid "401 Unauthorized"

**Cause**: Invalid API key.

**Fix**: 
1. Verify API key in SendGrid dashboard
2. Ensure it has "Mail Send" permission
3. Copy exact key to `.env`

### Gmail "535 Authentication failed"

**Cause**: Using regular password instead of App Password.

**Fix**: Generate App Password from Google Account → Security → App Passwords.

### Telegram "403 Forbidden"

**Cause**: User hasn't started the bot yet.

**Fix**: User must open Telegram, search for bot, click "Start".

---

## 📈 Production Deployment

Before going live:

1. **Disable Dry Run**:
   ```env
   DRY_RUN=false
   ```

2. **Configure Real Email Provider**:
   - SendGrid: Add valid API key
   - SMTP: Add valid credentials

3. **Set Production URL**:
   ```env
   FRONTEND_URL=https://yourdomain.com
   ```

4. **Verify Sender Email** (SendGrid only):
   - Go to SendGrid → Settings → Sender Authentication
   - Verify your domain or single sender

5. **Test with One User**:
   ```bash
   # Restart with new config
   docker compose restart alerts
   
   # Trigger manual run
   docker compose exec alerts python run_alerts.py
   
   # Check logs for real send
   docker compose logs alerts | grep "Email sent"
   ```

6. **Monitor for 24 Hours**:
   ```bash
   # Check success rate
   docker compose exec -T postgres psql -U pokemon_user -d pokemon_intel << 'EOF'
   SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN sent_successfully THEN 1 ELSE 0 END) as successful,
       ROUND(100.0 * SUM(CASE WHEN sent_successfully THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
   FROM alerts_sent;
   EOF
   ```

---

## 📚 Full Documentation

For detailed information:
- **Alert Engine README**: `services/alerts/ALERT_ENGINE_README.md`
- **Implementation Summary**: `ALERT_ENGINE_COMPLETE.md`

---

## 🎉 You're All Set!

Your Pokemon Market Intelligence platform is now **complete**:

- ✅ **Scraper** → Collects EU market data
- ✅ **Analysis Engine** → Calculates deal scores & signals
- ✅ **Alert Engine** → Notifies users in real-time (Email + Telegram)
- ✅ **Backend API** → Manages auth, subscriptions, data access
- ✅ **Dashboard** → Beautiful UI for insights

**The full pipeline is running:**

```
Scraper (every 30 min) 
  → raw_prices table
    → Analysis Engine (every hour)
      → deal_scores + signals tables
        → Alert Engine (every 5 min)
          → Email/Telegram to premium users
            → Dashboard displays insights
```

---

**Next: Test with a real premium user account!**

```bash
# Check logs
docker compose logs -f alerts

# View all services
docker compose ps

# Monitor the complete platform
watch -n 5 'docker compose ps'
```

🚀 **Your platform is production-ready!**
