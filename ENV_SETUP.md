# Environment Variables Setup

This document describes all environment variables needed for the project.

## Quick Setup

Run the setup script to automatically create all `.env` files:

```bash
./scripts/setup.sh
```

Or manually create the files as described below.

---

## Root Directory

Create `.env` in the project root for docker-compose:

```env
# PostgreSQL
POSTGRES_USER=pokemon_user
POSTGRES_PASSWORD=pokemon_password
POSTGRES_DB=pokemon_intel

# Frontend (for build-time)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Backend Service

Create `services/backend/.env`:

```env
# Application
APP_NAME=Pokemon Intel EU API
APP_VERSION=1.0.0
DEBUG=true
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Database
DATABASE_URL=postgresql+asyncpg://pokemon_user:pokemon_password@postgres:5432/pokemon_intel
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Security - CHANGE THESE IN PRODUCTION!
JWT_SECRET=your-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Stripe - Get from https://dashboard.stripe.com
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID_FREE=price_free_tier
STRIPE_PRICE_ID_PRO=price_pro_tier
STRIPE_PRICE_ID_ENTERPRISE=price_enterprise_tier

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@pokemon-intel-eu.com

# Redis (optional - for caching)
REDIS_URL=redis://redis:6379/0

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_BURST=100

# EU Compliance
DATA_RETENTION_DAYS=730
ENABLE_GDPR_FEATURES=true
```

### Generating JWT_SECRET

```bash
# Linux/Mac
openssl rand -hex 32

# Python
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Scraper Service

Create `services/scraper/.env`:

```env
# Application
APP_VERSION=1.0.0
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql+asyncpg://pokemon_user:pokemon_password@postgres:5432/pokemon_intel

# Scraping Configuration
SCRAPE_INTERVAL=60  # minutes
SCRAPE_TIMEOUT=30   # seconds
MAX_RETRIES=3
RETRY_DELAY=5       # seconds

# Rate Limiting
REQUESTS_PER_MINUTE=30
CONCURRENT_REQUESTS=3

# Proxy Configuration (optional)
PROXY_ENABLED=false
PROXY_URL=http://proxy-server:port
PROXY_USERNAME=your_username
PROXY_PASSWORD=your_password
PROXY_COUNTRY=NL  # Netherlands for EU

# Browser Configuration
HEADLESS=true
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36

# Data Sources
CARDMARKET_ENABLED=true
CARDTRADER_ENABLED=true
TCGPLAYER_EU_ENABLED=false

# Storage
BATCH_SIZE=100
CACHE_ENABLED=true
CACHE_TTL=3600  # seconds
```

### EU Proxy Providers

For production scraping in EU:
- Bright Data (https://brightdata.com/)
- Smartproxy (https://smartproxy.com/)
- Oxylabs (https://oxylabs.io/)

---

## Analysis Service

Create `services/analysis/.env`:

```env
# Application
APP_VERSION=1.0.0
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql+asyncpg://pokemon_user:pokemon_password@postgres:5432/pokemon_intel

# Scheduling (cron expressions)
ANALYSIS_SCHEDULE=0 * * * *      # Every hour
DEAL_SCORE_SCHEDULE=*/30 * * * * # Every 30 minutes
SIGNAL_SCHEDULE=*/15 * * * *     # Every 15 minutes

# Analysis Parameters
LOOKBACK_DAYS=30              # Days of historical data
MIN_DATA_POINTS=10            # Minimum data points required
OUTLIER_THRESHOLD=3.0         # Standard deviations

# Deal Score Weights (must sum to 1.0)
WEIGHT_PRICE_VS_AVG=0.4       # Current vs average price
WEIGHT_PRICE_TREND=0.3        # Price trend direction
WEIGHT_AVAILABILITY=0.2       # Stock availability
WEIGHT_SELLER_RATING=0.1      # Seller reputation

# Signal Detection
PRICE_DROP_THRESHOLD=0.15     # 15% drop triggers alert
PRICE_SPIKE_THRESHOLD=0.25    # 25% increase
VOLATILITY_THRESHOLD=0.20     # 20% volatility

# Performance
BATCH_SIZE=1000
PARALLEL_WORKERS=4

# Storage
EXPORT_ENABLED=false
EXPORT_PATH=/app/data/exports
```

---

## Frontend Service

Create `services/frontend/.env`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: Analytics
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
# NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

**Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

---

## Production Configuration

### Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET
- [ ] Use production Stripe keys
- [ ] Configure real SMTP server
- [ ] Enable HTTPS only
- [ ] Set DEBUG=false
- [ ] Configure CORS for production domain
- [ ] Enable proxy for scraper
- [ ] Set up monitoring
- [ ] Configure backups

### Environment-Specific Values

**Development**:
```env
DEBUG=true
LOG_LEVEL=DEBUG
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Staging**:
```env
DEBUG=false
LOG_LEVEL=INFO
NEXT_PUBLIC_API_URL=https://api-staging.yourdomain.com
```

**Production**:
```env
DEBUG=false
LOG_LEVEL=WARNING
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## Database URL Formats

### Local (Docker Compose)
```
postgresql+asyncpg://pokemon_user:pokemon_password@postgres:5432/pokemon_intel
```

### AWS RDS
```
postgresql+asyncpg://username:password@dbname.xxxxx.eu-west-1.rds.amazonaws.com:5432/pokemon_intel
```

### DigitalOcean
```
postgresql+asyncpg://username:password@dbname-do-user-xxxxx.db.ondigitalocean.com:25060/pokemon_intel?sslmode=require
```

---

## Verification

After setting up environment variables, verify the configuration:

```bash
# Start services
docker-compose up -d

# Check backend can connect to database
docker-compose exec backend python -c "from app.database import engine; print('✓ Database connected')"

# Check all services are healthy
docker-compose ps
```

All services should show as "healthy" or "Up".

---

## Troubleshooting

### Backend won't start
- Check DATABASE_URL is correct
- Verify PostgreSQL is running: `docker-compose ps postgres`
- Check logs: `docker-compose logs backend`

### Scraper fails
- Verify DATABASE_URL
- Check Playwright is installed
- Review logs: `docker-compose logs scraper`

### Frontend can't reach backend
- Verify NEXT_PUBLIC_API_URL
- Check backend is running: `curl http://localhost:8000/health`
- Review CORS_ORIGINS in backend .env

### Database connection errors
- Verify credentials match in root .env and service .env files
- Check PostgreSQL is accepting connections
- Verify port 5432 is not in use by another process
