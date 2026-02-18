# Architecture Documentation

## System Overview

Pokemon Market Intelligence EU is a production-ready SaaS platform built as a monorepo with four microservices:

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                   │
│                    (Port 80/443)                         │
└───────────────┬─────────────────────┬───────────────────┘
                │                     │
        ┌───────▼────────┐    ┌──────▼───────┐
        │   Frontend     │    │   Backend    │
        │   (Next.js)    │    │  (FastAPI)   │
        │   Port 3000    │    │  Port 8000   │
        └────────────────┘    └──────┬───────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
            ┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
            │   Scraper    │ │  Analysis   │ │ PostgreSQL  │
            │  (Playwright)│ │  (Pandas)   │ │   Port 5432 │
            └──────────────┘ └─────────────┘ └─────────────┘
```

## Service Responsibilities

### 1. Backend API (`services/backend`)

**Purpose**: RESTful API for all client-backend communication

**Stack**:
- FastAPI (async Python web framework)
- SQLAlchemy 2.0 (async ORM)
- Alembic (database migrations)
- JWT authentication
- Stripe integration

**Key Features**:
- User authentication & authorization
- Subscription management via Stripe
- Price data API endpoints
- Alert configuration
- Admin functionality

**Directory Structure**:
```
backend/
├── app/
│   ├── main.py              # FastAPI app initialization
│   ├── config.py            # Settings management
│   ├── database.py          # DB connection & session
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic validation schemas
│   ├── api/                 # Route handlers
│   ├── auth/                # JWT & authentication
│   ├── stripe/              # Stripe integration
│   └── utils/               # Utility functions
├── alembic/                 # Database migrations
└── requirements.txt
```

### 2. Scraper Service (`services/scraper`)

**Purpose**: Automated collection of EU Pokemon card prices

**Stack**:
- Playwright (headless browser automation)
- BeautifulSoup4 (HTML parsing)
- Requests (HTTP client)
- APScheduler (job scheduling)

**Key Features**:
- Scheduled scraping jobs
- Rate limiting & proxy support
- EU-specific retailers
- Append-only data storage
- Error handling & retry logic

**Directory Structure**:
```
scraper/
├── app/
│   ├── main.py              # Service entry point
│   ├── config.py            # Scraper configuration
│   ├── database.py          # DB operations
│   ├── scrapers/            # Scraper implementations
│   │   └── base.py          # Base scraper class
│   ├── models/              # Data models
│   └── utils/               # Rate limiter, proxy manager
└── requirements.txt
```

### 3. Analysis Service (`services/analysis`)

**Purpose**: Process raw data and calculate market insights

**Stack**:
- Pandas & NumPy (data processing)
- Scikit-learn (statistical analysis)
- APScheduler (job scheduling)

**Key Features**:
- Market statistics calculation
- Deal score computation
- Price signal detection
- Trend analysis
- Batch processing

**Directory Structure**:
```
analysis/
├── app/
│   ├── main.py              # Service entry point
│   ├── config.py            # Analysis configuration
│   ├── database.py          # DB operations
│   ├── jobs/                # Scheduled jobs
│   ├── calculators/         # Analysis algorithms
│   │   └── base.py          # Base calculator class
│   └── utils/               # Helper functions
└── requirements.txt
```

### 4. Frontend (`services/frontend`)

**Purpose**: User interface and dashboard

**Stack**:
- Next.js 14 (React framework with App Router)
- TailwindCSS (utility-first styling)
- Chart.js (data visualization)
- TypeScript (type safety)

**Key Features**:
- Responsive design
- Server-side rendering
- Price charts & visualizations
- Subscription management UI
- Alert configuration

**Directory Structure**:
```
frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   └── globals.css      # Global styles
│   ├── components/          # React components
│   ├── lib/                 # Utilities & API client
│   └── types/               # TypeScript definitions
├── public/                  # Static assets
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Infrastructure

### Database (PostgreSQL 16)

**Tables**:
- `users` - User accounts
- `subscriptions` - Stripe subscriptions
- `raw_prices` - Append-only price data
- `processed_prices` - Aggregated statistics
- `deal_scores` - Deal quality scores
- `alerts` - User price alerts
- `scrape_logs` - Scraping logs
- `market_statistics` - Market metrics

**Features**:
- Automatic timestamps
- Full-text search (pg_trgm)
- Indexes for performance
- Migration support via Alembic

### Nginx Reverse Proxy

**Purpose**: Single entry point for all services

**Features**:
- Route `/` → Frontend
- Route `/api/` → Backend
- Rate limiting
- Gzip compression
- Security headers
- SSL/TLS support (production)

## Data Flow

### 1. Price Collection Flow
```
EU Retailers → Scraper (Playwright) → raw_prices table
                     ↓
            Analysis Service (scheduled)
                     ↓
            processed_prices + deal_scores tables
                     ↓
            Backend API → Frontend (charts & alerts)
```

### 2. User Authentication Flow
```
Frontend → Backend API (login)
               ↓
         JWT token issued
               ↓
         Stored in localStorage
               ↓
         Sent with each request (Authorization header)
```

### 3. Subscription Flow
```
User selects plan → Frontend
                        ↓
                   Stripe Checkout
                        ↓
                   Webhook → Backend API
                        ↓
                   Update subscriptions table
                        ↓
                   Grant access to premium features
```

## Security Considerations

### Authentication & Authorization
- JWT tokens with short expiration (30 minutes)
- Refresh tokens for session persistence
- Password hashing with bcrypt
- Role-based access control

### Data Protection
- All secrets in environment variables
- Stripe webhook signature verification
- SQL injection prevention (parameterized queries)
- XSS protection (React escaping + CSP headers)
- CORS configuration

### EU Compliance (GDPR)
- Data retention policies
- User data export capability
- Right to be forgotten
- Cookie consent
- Privacy policy

## Deployment Strategy

### Development
```bash
docker-compose up -d
```

### Production Recommendations

1. **Database**: Managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
   - EU region (eu-west-1, eu-central-1)
   - Automated backups
   - Read replicas for scaling

2. **Container Orchestration**: Kubernetes or Docker Swarm
   - Auto-scaling based on load
   - Rolling updates
   - Health checks

3. **CDN**: CloudFlare or AWS CloudFront
   - Frontend asset caching
   - DDoS protection
   - SSL/TLS termination

4. **Monitoring**:
   - Logs: ELK Stack or CloudWatch
   - Metrics: Prometheus + Grafana
   - APM: New Relic or DataDog
   - Uptime: UptimeRobot

5. **CI/CD**: GitHub Actions or GitLab CI
   - Automated testing
   - Docker image builds
   - Deployment to staging/production

## Scaling Considerations

### Horizontal Scaling
- **Backend**: Multiple instances behind load balancer
- **Scraper**: Parallel workers with job queue
- **Analysis**: Distributed processing with Celery
- **Frontend**: CDN + multiple server instances

### Vertical Scaling
- **Database**: Increase resources (CPU, RAM)
- **Services**: Optimize queries and algorithms

### Caching Strategy
- Redis for session storage
- API response caching
- Database query caching
- Frontend static asset caching

## Performance Optimization

### Database
- Proper indexing on frequently queried columns
- Connection pooling (SQLAlchemy)
- Partitioning for large tables (raw_prices by month)
- EXPLAIN ANALYZE for query optimization

### Backend
- Async operations throughout
- Pagination for large result sets
- Response compression
- Database query optimization

### Frontend
- Code splitting
- Image optimization
- Lazy loading
- Server-side rendering for SEO

### Scraper
- Rate limiting to avoid bans
- Concurrent requests within limits
- Proxy rotation
- Caching of rarely changing data

## Maintenance & Operations

### Regular Tasks
- Database backups (automated daily)
- Log rotation
- Security updates
- Performance monitoring
- Cost optimization

### Disaster Recovery
- Database point-in-time recovery
- Service redundancy
- Backup verification
- Incident response plan

### Monitoring Alerts
- Service health checks
- Error rate thresholds
- Response time degradation
- Database connection issues
- Disk space warnings
