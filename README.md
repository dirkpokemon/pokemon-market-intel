# Pokemon Market Intelligence EU

A production-ready SaaS platform for collecting, analyzing, and delivering EU Pokémon market price intelligence.

## Architecture Overview

This monorepo contains four main services and supporting infrastructure:

```
├── services/
│   ├── backend/          # FastAPI REST API
│   ├── scraper/          # Playwright-based price scraper
│   ├── analysis/         # Market analysis and deal scoring
│   └── frontend/         # Next.js dashboard
└── infrastructure/
    ├── nginx/            # Reverse proxy
    └── postgres/         # Database initialization
```

## Technology Stack

### Backend API
- **Framework**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy 2.0 with async support
- **Auth**: JWT-based authentication
- **Payments**: Stripe webhook integration
- **Migrations**: Alembic

### Scraper Service
- **Browser**: Playwright (headless Chrome)
- **Parsing**: BeautifulSoup4, Requests
- **Proxy**: EU proxy support
- **Rate Limiting**: Token bucket algorithm

### Analysis Service
- **Processing**: Pandas, NumPy
- **Scheduling**: APScheduler
- **Tasks**: Market stats, deal scores, signals

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS
- **Charts**: Chart.js / React-Chartjs-2
- **Auth**: JWT session management

### Infrastructure
- **Database**: PostgreSQL 16
- **Proxy**: Nginx
- **Containerization**: Docker & Docker Compose
- **Environment**: EU-optimized deployment

## Prerequisites

- Docker Engine 24.0+
- Docker Compose 2.20+
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local service development)

## Quick Start

### 1. Clone and Configure

```bash
git clone <repository-url>
cd pokemon-market-intel

# Copy and configure environment files
cp services/backend/.env.example services/backend/.env
cp services/scraper/.env.example services/scraper/.env
cp services/analysis/.env.example services/analysis/.env
cp services/frontend/.env.example services/frontend/.env

# Edit .env files with your configuration
```

### 2. Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 3. Run Database Migrations

```bash
# Run initial migrations
docker-compose exec backend alembic upgrade head
```

### 4. Access Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Postgres**: localhost:5432

## Development Setup

### Backend Development

```bash
cd services/backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Run locally
uvicorn app.main:app --reload --port 8000
```

### Scraper Development

```bash
cd services/scraper
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Run scraper
python -m app.main
```

### Analysis Development

```bash
cd services/analysis
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run analysis jobs
python -m app.main
```

### Frontend Development

```bash
cd services/frontend
npm install

# Run dev server
npm run dev
```

## Database Migrations

```bash
# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback
docker-compose exec backend alembic downgrade -1
```

## Service Architecture

### Backend API (`services/backend`)

RESTful API providing:
- User authentication and authorization
- Subscription management via Stripe
- Historical price data endpoints
- Market insights and alerts
- Admin panel endpoints

### Scraper Service (`services/scraper`)

Automated data collection:
- Scheduled scraping of EU retailers
- Playwright for dynamic content
- Rate limiting and proxy rotation
- Raw data storage to PostgreSQL

### Analysis Service (`services/analysis`)

Data processing pipeline:
- Market statistics calculation
- Deal score computation
- Signal detection (price drops, trends)
- Scheduled batch processing

### Frontend (`services/frontend`)

User dashboard:
- Public marketing pages
- Authenticated user dashboard
- Real-time price charts
- Alert configuration
- Subscription management

## Environment Variables

Each service has its own `.env.example` file. Key variables:

### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT tokens
- `STRIPE_SECRET_KEY`: Stripe API key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret

### Scraper
- `DATABASE_URL`: PostgreSQL connection string
- `PROXY_URL`: EU proxy endpoint
- `SCRAPE_INTERVAL`: Scraping frequency

### Analysis
- `DATABASE_URL`: PostgreSQL connection string
- `ANALYSIS_SCHEDULE`: Cron expression

### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXTAUTH_SECRET`: NextAuth secret

## Production Deployment

### EU Deployment Checklist

- [ ] Configure EU-region database (e.g., AWS RDS eu-west-1)
- [ ] Set up EU proxy for scraper
- [ ] Configure GDPR-compliant logging
- [ ] Enable SSL/TLS certificates
- [ ] Set up monitoring (health checks, logs)
- [ ] Configure backup strategy
- [ ] Set resource limits in docker-compose
- [ ] Enable rate limiting in Nginx
- [ ] Configure CDN for frontend assets

### Security Considerations

- All secrets in environment variables (never committed)
- JWT tokens with short expiration
- HTTPS-only in production
- Stripe webhook signature verification
- SQL injection prevention (SQLAlchemy parameterized queries)
- CORS configuration
- Rate limiting on API endpoints

## Monitoring

Health check endpoints:
- Backend: `GET /health`
- Scraper: Internal health check
- Analysis: Internal health check

Recommended monitoring tools:
- **Logs**: Docker logs, ELK stack, or CloudWatch
- **Metrics**: Prometheus + Grafana
- **Uptime**: UptimeRobot, Pingdom
- **APM**: New Relic, DataDog

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Rebuild images
docker-compose build --no-cache

# Reset everything
docker-compose down -v
docker-compose up -d
```

### Database connection issues

```bash
# Check database is running
docker-compose ps postgres

# Test connection
docker-compose exec backend python -c "from app.database import engine; print(engine)"
```

### Frontend can't reach backend

- Verify `NEXT_PUBLIC_API_URL` in frontend/.env
- Check Nginx configuration
- Ensure backend is healthy: `curl http://localhost:8000/health`

## Contributing

1. Create feature branch
2. Follow code style (Black, ESLint)
3. Write tests
4. Update documentation
5. Submit pull request

## License

Proprietary - All rights reserved

## Support

For support, contact: support@pokemon-intel-eu.com
