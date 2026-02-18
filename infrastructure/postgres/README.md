# PostgreSQL Database

## Schema Overview

The database uses PostgreSQL 16 with the following main tables:

### Core Tables

- **users**: User accounts and authentication
- **subscriptions**: Stripe subscription management
- **raw_prices**: Append-only price data from scrapers
- **processed_prices**: Aggregated price statistics
- **deal_scores**: Calculated deal quality scores
- **alerts**: User price alerts
- **scrape_logs**: Scraping session tracking
- **market_statistics**: Market-wide metrics

## Features

- UUID extension for unique identifiers
- Full-text search with pg_trgm
- Automatic timestamp updates
- Indexes for performance
- GDPR-compliant structure

## Migrations

Database migrations are managed through Alembic in the backend service.

## Backup Strategy

For production:
1. Automated daily backups
2. Point-in-time recovery enabled
3. EU region replication
4. 30-day retention policy
