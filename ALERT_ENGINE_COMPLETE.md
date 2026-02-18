# 🔔 Alert Engine Implementation Complete!

## ✅ What Was Built

A production-ready, fully automated **Alert Engine** that sends real-time market intelligence alerts to premium users via Email and Telegram.

---

## 🏗️ Architecture

```
services/alerts/
├── app/
│   ├── __init__.py
│   ├── config.py              # Configuration & settings
│   ├── database.py            # Database connection
│   ├── main.py                # Main scheduler entry point
│   ├── alert_engine.py        # Core alert processing logic
│   ├── models/
│   │   ├── alert_sent.py      # Tracks sent alerts
│   │   ├── user.py            # User model (read-only)
│   │   └── signal.py          # Signal model (read-only)
│   ├── providers/
│   │   ├── email_provider.py  # Email abstraction (SendGrid/SMTP)
│   │   └── telegram_provider.py # Telegram Bot API
│   └── templates/
│       ├── email_alert.html   # Immediate alert template
│       └── email_digest.html  # Daily digest template
├── Dockerfile
├── requirements.txt
├── run_alerts.py              # Cron entry point
├── create_alerts_table.sql    # Database setup
├── ALERT_ENGINE_README.md     # Full documentation
└── .env.example
```

---

## 🎯 Key Features

### 1. **Intelligent Alert Routing**
- **High Priority (signal_level = 'high')** → Immediate alert within 5 minutes
- **Medium Priority (signal_level = 'medium')** → Daily digest
- **Low Priority (signal_level = 'low')** → Ignored

### 2. **Multi-Channel Delivery**
- **Email**: SendGrid API or SMTP (Gmail, custom)
- **Telegram**: Bot API with formatted messages
- Beautiful HTML templates
- Mobile-responsive design

### 3. **Safety & Reliability**
- ✅ Duplicate prevention via `alerts_sent` table
- ✅ Rate limiting (10 alerts per user per day)
- ✅ Only sends to active premium users (paid/pro/admin)
- ✅ Comprehensive error handling
- ✅ All sends logged to database
- ✅ Dry-run mode for testing

### 4. **Flexible Scheduling**
- **Continuous Mode**: APScheduler runs in Docker container
- **Cron Mode**: Run once and exit (for manual cron jobs)
- Configurable check interval (default: 5 minutes)
- Configurable digest time (default: 9 AM UTC)

---

## 🚀 Quick Start

### Step 1: Create Database Table

```bash
docker compose exec -T postgres psql -U pokemon_user -d pokemon_intel < services/alerts/create_alerts_table.sql
```

**What this does:**
- Creates `alerts_sent` table to track all sent alerts
- Adds alert preference columns to `users` table:
  - `telegram_chat_id` (for Telegram delivery)
  - `alert_email` (custom email override)
  - `alerts_enabled` (master switch, default: true)

### Step 2: Configure Environment

Create `services/alerts/.env`:

```env
# Database
DATABASE_URL=postgresql+asyncpg://pokemon_user:pokemon_password@postgres:5432/pokemon_intel

# Email Provider (choose one)
EMAIL_PROVIDER=sendgrid  # or 'smtp'

# SendGrid (recommended)
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=alerts@pokemonintel.eu
SENDGRID_FROM_NAME=Pokemon Intel EU

# OR SMTP (alternative)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=alerts@pokemonintel.eu
SMTP_USE_TLS=true

# Telegram (optional)
TELEGRAM_ENABLED=false
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Alert Engine
ALERT_ENGINE_ENABLED=true
CHECK_INTERVAL_MINUTES=5
DIGEST_SEND_HOUR=9
MAX_ALERTS_PER_USER_PER_DAY=10

# Frontend
FRONTEND_URL=http://localhost:3000

# Testing
DRY_RUN=false  # Set to true for testing
LOG_LEVEL=INFO
```

### Step 3: Build and Start

```bash
# Build alert service
docker compose build alerts

# Start in background
docker compose up -d alerts

# View logs
docker compose logs -f alerts
```

**Expected output:**
```
🚀 Starting Alert Engine with APScheduler
Configuration:
  - Check interval: 5 minutes
  - Daily digest: enabled
  - Digest send hour: 9:00 UTC
  - Email provider: sendgrid
  - Telegram: disabled
✅ Scheduled immediate alerts every 5 minutes
✅ Scheduled daily digest at 9:00 UTC
🎯 Alert Engine is now running
```

---

## 📧 Email Provider Setup

### Option 1: SendGrid (Recommended)

**Why SendGrid?**
- Free tier: 100 emails/day
- Best deliverability
- Simple API
- Email analytics

**Setup:**
1. Sign up at https://sendgrid.com
2. Verify your sender email
3. Create API Key (Settings → API Keys)
4. Give it "Mail Send" permissions
5. Copy to `.env`:
   ```env
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.abc123...
   ```

### Option 2: SMTP (Gmail)

**Setup:**
1. Enable 2-Factor Authentication on Google Account
2. Generate App Password (Security → App Passwords)
3. Copy to `.env`:
   ```env
   EMAIL_PROVIDER=smtp
   SMTP_USERNAME=your_email@gmail.com
   SMTP_PASSWORD=your_16_char_app_password
   ```

---

## 🤖 Telegram Setup (Optional)

### 1. Create Bot

1. Open Telegram, search for `@BotFather`
2. Send `/newbot`
3. Follow instructions
4. Copy bot token to `.env`:
   ```env
   TELEGRAM_ENABLED=true
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234...
   ```

### 2. Get User Chat IDs

Users need their Telegram chat_id to receive alerts:

1. **User starts the bot** (search for bot name, click "Start")
2. **Get chat_id**:
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Look for `"chat":{"id":123456789}`
3. **Update database**:
   ```sql
   UPDATE users 
   SET telegram_chat_id = '123456789' 
   WHERE email = 'user@example.com';
   ```

---

## 🧪 Testing

### 1. Dry Run Mode

Test without actually sending alerts:

```env
DRY_RUN=true
```

Restart service:
```bash
docker compose restart alerts
docker compose logs -f alerts
```

You'll see:
```
[DRY RUN] Would send email to user@example.com: 🔥 HIGH ALERT: Charizard ex
```

### 2. Manual Test Run

```bash
docker compose exec alerts python run_alerts.py
```

### 3. Check Sent Alerts

```sql
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
LIMIT 10;
```

### 4. Insert Test Signal

```sql
-- Create a high-priority test signal
INSERT INTO signals (
    signal_type, 
    signal_level, 
    product_name, 
    product_set,
    current_price,
    market_avg_price,
    deal_score,
    description,
    priority,
    is_active,
    detected_at
) VALUES (
    'high_alert',
    'high',
    'Charizard ex (Test)',
    'Obsidian Flames',
    45.99,
    75.00,
    95.0,
    'This is a test alert to verify the alert engine is working.',
    10,
    true,
    NOW()
);
```

Wait up to 5 minutes and check logs:
```bash
docker compose logs alerts --tail 50
```

---

## 📊 Monitoring

### View Alert Stats

```sql
-- Alerts sent today
SELECT 
    COUNT(*) as total_alerts,
    SUM(CASE WHEN sent_successfully THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN NOT sent_successfully THEN 1 ELSE 0 END) as failed
FROM alerts_sent
WHERE sent_at >= CURRENT_DATE;

-- Alerts by channel
SELECT 
    channel,
    COUNT(*) as count
FROM alerts_sent
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY channel;

-- Top alerted products
SELECT 
    s.product_name,
    COUNT(*) as alert_count
FROM alerts_sent a
JOIN signals s ON a.signal_id = s.id
WHERE a.sent_at >= NOW() - INTERVAL '7 days'
GROUP BY s.product_name
ORDER BY alert_count DESC
LIMIT 10;
```

### Real-time Logs

```bash
# Follow all logs
docker compose logs -f alerts

# Filter for sent alerts
docker compose logs alerts | grep "✅"

# Filter for errors
docker compose logs alerts | grep "❌"
```

---

## 🔄 Operational Modes

### Mode 1: Continuous (Docker Container)
**Best for:** Production deployment

```bash
docker compose up -d alerts
```

The scheduler will:
- Check for high-priority signals every 5 minutes
- Send daily digest at 9 AM UTC
- Run continuously until stopped

### Mode 2: Cron Job
**Best for:** Custom scheduling

```bash
# Run once and exit
docker compose exec alerts python run_alerts.py
```

Add to crontab:
```cron
# Every 5 minutes
*/5 * * * * cd /path/to/project && docker compose exec alerts python run_alerts.py

# Daily at 9 AM
0 9 * * * cd /path/to/project && docker compose exec alerts python run_alerts.py
```

---

## 🛡️ Safety Features

### 1. Duplicate Prevention
Every sent alert is recorded in `alerts_sent` table with `user_id` + `signal_id`. The engine checks this before sending.

### 2. Rate Limiting
Max 10 immediate alerts per user per day. Prevents spam if many signals trigger.

### 3. Premium-Only
Only sends to users with:
- `is_active = true`
- `role IN ('paid', 'pro', 'admin')`
- `alerts_enabled = true`

### 4. Error Handling
All failures are logged with:
- Error message
- User email
- Signal details
- Timestamp

### 5. Dry Run Mode
Test without sending real alerts. All logic runs, logs show what *would* be sent.

---

## 📱 Email Templates

### Immediate Alert
Beautiful, mobile-responsive HTML email with:
- Product name and set
- Current price vs market average
- Deal score (0-100)
- Visual badge (high/medium priority)
- Call-to-action button to dashboard
- Unsubscribe/preferences links

### Daily Digest
Summary email with:
- Count of new signals
- Grid of signal cards
- Link to full dashboard
- Sent once per day at configured hour

---

## 🔧 Configuration Options

### Alert Rules (`config.py`)

```python
# Severity levels
HIGH_SEVERITY_LEVELS = ["high"]      # Immediate
MEDIUM_SEVERITY_LEVELS = ["medium"]  # Digest
LOW_SEVERITY_LEVELS = ["low"]        # Ignored

# Deal score thresholds
MIN_DEAL_SCORE_HIGH = 80.0
MIN_DEAL_SCORE_MEDIUM = 70.0

# Rate limiting
MAX_ALERTS_PER_USER_PER_DAY = 10

# Scheduling
CHECK_INTERVAL_MINUTES = 5
DIGEST_SEND_HOUR = 9  # UTC
```

### User Preferences

Users can customize via database:

```sql
-- Disable all alerts for a user
UPDATE users SET alerts_enabled = false WHERE email = 'user@example.com';

-- Add Telegram chat_id
UPDATE users SET telegram_chat_id = '123456789' WHERE email = 'user@example.com';

-- Use custom alert email
UPDATE users SET alert_email = 'custom@example.com' WHERE email = 'user@example.com';
```

---

## 🚨 Troubleshooting

### No Alerts Sending?

**1. Check for eligible users:**
```sql
SELECT * FROM users 
WHERE is_active = true 
AND role IN ('paid', 'pro', 'admin')
AND alerts_enabled = true;
```

**2. Check for unsent signals:**
```sql
SELECT * FROM signals 
WHERE is_active = true 
AND is_sent = false 
AND signal_level = 'high';
```

**3. Check email provider:**
```bash
docker compose logs alerts | grep "Email provider"
```

### SendGrid Errors

- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: Need "Mail Send" permission on API key
- **Unverified sender**: Verify sender email in SendGrid dashboard

### Gmail/SMTP Errors

- **535 Authentication failed**: Use App Password, not regular password
- **Connection refused**: Check SMTP_HOST and SMTP_PORT
- **TLS error**: Set `SMTP_USE_TLS=true`

### Telegram Errors

- **401 Unauthorized**: Invalid bot token
- **400 Bad Request**: Invalid chat_id format
- **403 Forbidden**: User hasn't started the bot yet

---

## 📈 Production Checklist

Before deploying to production:

- [ ] `DRY_RUN=false`
- [ ] `ALERT_ENGINE_ENABLED=true`
- [ ] Valid email provider credentials (SendGrid or SMTP)
- [ ] Sender email verified (if using SendGrid)
- [ ] `FRONTEND_URL` set to production domain
- [ ] Database table `alerts_sent` created
- [ ] At least one premium user exists
- [ ] Test signal processed successfully
- [ ] Logs show no errors
- [ ] Telegram bot configured (if using)

---

## 🎉 Summary

The Alert Engine is now fully integrated into your Pokemon Market Intelligence platform!

**What it does:**
- ✅ Monitors `signals` table every 5 minutes
- ✅ Sends immediate alerts for high-priority signals (Email + Telegram)
- ✅ Compiles and sends daily digest of medium-priority signals
- ✅ Prevents duplicates and rate limits
- ✅ Logs all activity
- ✅ Only sends to active premium users

**Next steps:**
1. Create database table
2. Configure email provider
3. Start the service
4. Monitor logs
5. Test with a sample signal

**Full documentation:** `services/alerts/ALERT_ENGINE_README.md`

---

**Your platform is now complete:**
- 🔍 **Scraper** → Collects market data
- 📊 **Analysis Engine** → Calculates deal scores & signals
- 🔔 **Alert Engine** → Notifies users (NEW!)
- 🖥️ **Dashboard** → Displays insights
- 💳 **Backend API** → Manages users & subscriptions

🚀 **Ready for production!**
