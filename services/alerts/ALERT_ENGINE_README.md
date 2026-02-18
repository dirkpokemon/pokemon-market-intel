```markdown
# 🔔 Alert Engine

Production-ready alert system that sends real-time and digest notifications to premium users based on market signals.

---

## Features

### Alert Types
- **Immediate Alerts** (High Priority)
  - Sent within 5 minutes of signal detection
  - For signals with `signal_level = 'high'`
  - Multiple delivery channels (Email + Telegram)

- **Daily Digest** (Medium Priority)
  - Compiled once per day
  - For signals with `signal_level = 'medium'`
  - Email only
  - Sent at configured hour (default: 9 AM UTC)

- **Low Priority** (Ignored)
  - Signals with `signal_level = 'low'` are not sent

### Delivery Channels
1. **Email**
   - SendGrid API (recommended)
   - SMTP (Gmail, custom servers)
   - Beautiful HTML templates
   - Mobile-responsive design

2. **Telegram Bot**
   - Optional channel
   - Formatted HTML messages
   - Instant delivery
   - Requires user's chat ID

### Safety Features
- ✅ Duplicate prevention (tracks all sent alerts)
- ✅ Rate limiting (max alerts per user per day)
- ✅ Only sends to active premium users
- ✅ Comprehensive error handling
- ✅ All sends are logged
- ✅ Dry-run mode for testing

---

## Installation & Setup

### 1. Create alerts_sent Table

```bash
docker compose exec -T postgres psql -U pokemon_user -d pokemon_intel < services/alerts/create_alerts_table.sql
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

#### Email (SendGrid - Recommended)
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=alerts@pokemonintel.eu
SENDGRID_FROM_NAME=Pokemon Intel EU
```

**Get SendGrid API Key:**
1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Go to Settings → API Keys → Create API Key
3. Give it "Mail Send" permissions
4. Copy the API key to `.env`

#### Email (SMTP - Alternative)
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password  # NOT your Gmail password!
SMTP_FROM_EMAIL=alerts@pokemonintel.eu
SMTP_USE_TLS=true
```

**Gmail App Password:**
1. Go to Google Account → Security
2. Enable 2-Factor Authentication
3. Generate App Password for "Mail"
4. Use that 16-character password in `.env`

#### Telegram (Optional)
```env
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

**Create Telegram Bot:**
1. Open Telegram, search for @BotFather
2. Send `/newbot`
3. Follow instructions to create bot
4. Copy the bot token to `.env`
5. Users need to get their chat_id (see below)

### 3. Build and Start

```bash
# Build the alert service
docker compose build alerts

# Start in scheduler mode (continuous)
docker compose up -d alerts

# View logs
docker compose logs -f alerts
```

---

## Usage

### Running Modes

#### 1. Scheduler Mode (Recommended for Production)
Runs continuously with APScheduler:
```bash
docker compose up -d alerts
```

The engine will:
- Check for high-priority signals every 5 minutes
- Send daily digest at 9 AM UTC
- Log all activity

#### 2. Manual/Cron Mode
Run once and exit (good for cron jobs):
```bash
docker compose exec alerts python run_alerts.py
```

Or use Docker run:
```bash
docker compose run --rm alerts python run_alerts.py
```

### Cron Schedule Example
```cron
# Run every 5 minutes
*/5 * * * * cd /path/to/project && docker compose exec alerts python run_alerts.py

# Run daily digest at 9 AM
0 9 * * * cd /path/to/project && docker compose exec alerts python run_alerts.py
```

---

## Configuration

### Alert Rules (config.py)

```python
# Severity mapping
HIGH_SEVERITY_LEVELS = ["high"]      # Immediate alerts
MEDIUM_SEVERITY_LEVELS = ["medium"]  # Daily digest
LOW_SEVERITY_LEVELS = ["low"]        # Ignored

# Rate limiting
MAX_ALERTS_PER_USER_PER_DAY = 10    # Prevent spam

# Minimum deal scores for alerts
MIN_DEAL_SCORE_HIGH = 80.0
MIN_DEAL_SCORE_MEDIUM = 70.0

# Scheduling
CHECK_INTERVAL_MINUTES = 5          # How often to check for new signals
DIGEST_SEND_HOUR = 9                # UTC hour to send daily digest
```

### User Preferences

Users table supports:
- `alerts_enabled` - Master switch for all alerts
- `telegram_chat_id` - For Telegram delivery
- `alert_email` - Custom email (if different from login)

---

## Telegram Setup

### For Users: Get Your Chat ID

1. **Start your bot:**
   - Search for your bot name in Telegram
   - Click "Start"

2. **Get your Chat ID:**
   - Open https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   - Look for `"chat":{"id":123456789}`
   - Save that number

3. **Update your account:**
   ```sql
   UPDATE users 
   SET telegram_chat_id = '123456789' 
   WHERE email = 'your@email.com';
   ```

### For Developers: Test Bot

```python
# Test connection
docker compose exec alerts python -c "
from app.providers.telegram_provider import get_telegram_provider
import asyncio

async def test():
    bot = get_telegram_provider()
    if bot:
        info = await bot.get_bot_info()
        print(f'Bot connected: {info.username}')

asyncio.run(test())
"
```

---

## Testing

### 1. Dry Run Mode
Test without actually sending:
```env
DRY_RUN=true
```

All alerts will be logged but not sent.

### 2. Manual Test
```bash
# Process alerts once
docker compose exec alerts python run_alerts.py

# Check logs
docker compose logs alerts --tail 50
```

### 3. Check Sent Alerts
```sql
-- View recent sent alerts
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
```

---

## Monitoring

### Key Metrics to Track

1. **Alert Delivery Rate**
   ```sql
   SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN sent_successfully THEN 1 ELSE 0 END) as successful,
       ROUND(100.0 * SUM(CASE WHEN sent_successfully THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
   FROM alerts_sent
   WHERE sent_at >= NOW() - INTERVAL '24 hours';
   ```

2. **Alerts Per Channel**
   ```sql
   SELECT 
       channel,
       COUNT(*) as count
   FROM alerts_sent
   WHERE sent_at >= NOW() - INTERVAL '7 days'
   GROUP BY channel;
   ```

3. **Top Alerted Products**
   ```sql
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

### Logs
```bash
# Follow logs in real-time
docker compose logs -f alerts

# Filter for errors only
docker compose logs alerts | grep "ERROR"

# Filter for sent alerts
docker compose logs alerts | grep "sent via"
```

---

## Production Deployment

### Environment Checklist
- [ ] `DRY_RUN=false`
- [ ] `ALERT_ENGINE_ENABLED=true`
- [ ] Valid SendGrid API key OR SMTP credentials
- [ ] `SENDGRID_FROM_EMAIL` verified in SendGrid
- [ ] `FRONTEND_URL` set to production domain
- [ ] Database migrations applied
- [ ] Telegram bot configured (if using)

### Docker Compose Integration

The alert service is already integrated in `docker-compose.yml`:
```yaml
alerts:
  build: ./services/alerts
  container_name: pokemon-intel-alerts
  restart: unless-stopped
  env_file:
    - ./services/alerts/.env
  depends_on:
    - postgres
  networks:
    - pokemon-network
```

### Scaling Considerations

- Alert engine is designed to run as **single instance**
- Database locking prevents duplicate sends
- If needed, can run multiple instances with different responsibilities:
  - Instance 1: Immediate alerts only
  - Instance 2: Daily digest only

---

## Troubleshooting

### Alerts Not Sending

**Check 1: Are there eligible users?**
```sql
SELECT COUNT(*) FROM users 
WHERE is_active = true 
AND role IN ('paid', 'pro', 'admin')
AND alerts_enabled = true;
```

**Check 2: Are there unsent signals?**
```sql
SELECT COUNT(*) FROM signals 
WHERE is_active = true 
AND is_sent = false 
AND signal_level = 'high';
```

**Check 3: Email provider configured?**
```bash
docker compose exec alerts python -c "
from app.providers.email_provider import get_email_provider
try:
    provider = get_email_provider()
    print(f'Email provider OK: {type(provider).__name__}')
except Exception as e:
    print(f'Email provider ERROR: {e}')
"
```

### SendGrid Errors

- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: API key doesn't have mail send permissions
- **Unverified sender**: Need to verify sender email in SendGrid

### SMTP Errors

- **535 Authentication failed**: Wrong username/password
- **Connection refused**: Check SMTP_HOST and SMTP_PORT
- **Gmail "Less secure apps"**: Use App Password, not regular password

### Telegram Errors

- **401 Unauthorized**: Invalid bot token
- **400 Bad Request**: Invalid chat_id format
- **403 Forbidden**: User hasn't started the bot yet

---

## Architecture

```
┌─────────────────┐
│  Alert Engine   │
│   (Scheduler)   │
└────────┬────────┘
         │
         ├──> Check Signals DB (every 5 min)
         │
         ├──> Find Premium Users
         │
         ├──> Check alerts_sent (prevent duplicates)
         │
         ├──> Send via Email Provider
         │    ├──> SendGrid API
         │    └──> SMTP
         │
         ├──> Send via Telegram Bot
         │
         └──> Record in alerts_sent
```

---

## API Reference

### AlertEngine Class

```python
from app.alert_engine import AlertEngine
from app.database import AsyncSessionLocal

async with AsyncSessionLocal() as db:
    engine = AlertEngine(db)
    
    # Process immediate alerts
    stats = await engine.process_high_priority_alerts()
    
    # Process daily digest
    stats = await engine.process_daily_digest()
```

### EmailProvider

```python
from app.providers.email_provider import get_email_provider, EmailMessage

provider = get_email_provider()

msg = EmailMessage(
    to_email="user@example.com",
    to_name="John Doe",
    subject="Test Alert",
    html_content="<h1>Hello</h1>"
)

success, message_id = await provider.send_email(msg)
```

### TelegramProvider

```python
from app.providers.telegram_provider import get_telegram_provider, TelegramMessage

provider = get_telegram_provider()

msg = TelegramMessage(
    chat_id="123456789",
    text="<b>Test Alert</b>",
    parse_mode="HTML"
)

success, message_id = await provider.send_message(msg)
```

---

## License

Part of Pokemon Market Intelligence EU platform.

---

**Questions or Issues?**
Check logs, review configuration, test in dry-run mode first!
```
