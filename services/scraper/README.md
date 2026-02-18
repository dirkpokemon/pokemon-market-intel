# Pokemon Market Intelligence EU - Scraper Service

Automated scraping service for collecting EU Pokemon card prices from multiple marketplaces.

## Features

- ✅ **CardMarket Scraper**: Largest European trading card marketplace
- ✅ **CardTrader Scraper**: Popular international marketplace  
- ✅ **Rate Limiting**: Token bucket algorithm to avoid bans
- ✅ **Retry Logic**: Exponential backoff for failed requests
- ✅ **Proxy Support**: EU proxy rotation capability
- ✅ **Database Logging**: Track all scraping sessions
- ✅ **Scheduled Jobs**: Configurable scraping intervals
- ✅ **Error Handling**: Graceful degradation on failures

## Architecture

```
scraper/
├── app/
│   ├── main.py              # Service orchestrator
│   ├── config.py            # Configuration
│   ├── scrapers/
│   │   ├── base.py          # Base scraper class
│   │   ├── cardmarket.py    # CardMarket implementation
│   │   └── cardtrader.py    # CardTrader implementation
│   ├── models/
│   │   ├── raw_price.py     # Price data model
│   │   └── scrape_log.py    # Session logging model
│   └── utils/
│       ├── rate_limiter.py  # Rate limiting
│       ├── retry.py         # Retry decorator
│       └── proxy_manager.py # Proxy rotation
```

## Configuration

Edit `services/scraper/.env`:

```env
# Scraping frequency
SCRAPE_INTERVAL=60  # minutes

# Performance
REQUESTS_PER_MINUTE=30
CONCURRENT_REQUESTS=3
SCRAPE_TIMEOUT=30
MAX_RETRIES=3

# Browser
HEADLESS=true

# Data sources
CARDMARKET_ENABLED=true
CARDTRADER_ENABLED=true

# Proxy (optional)
PROXY_ENABLED=false
PROXY_URL=http://proxy-server:port
PROXY_USERNAME=your_username
PROXY_PASSWORD=your_password
```

## Scraper Implementations

### CardMarket

The largest European trading card marketplace with millions of cards.

**Data Collected**:
- Card name, set, and number
- Current market price (EUR)
- Seller information
- Stock availability
- Card condition
- Language

**Scraping Strategy**:
- Iterates through popular Pokemon sets
- Extracts product listings from singles pages
- Respects rate limits
- Retries on failures

### CardTrader

Popular international marketplace with verified sellers.

**Data Collected**:
- Card details (name, set, number)
- Market prices in EUR
- Seller ratings
- Stock quantities
- Condition and language

**Scraping Strategy**:
- Targets Pokemon expansion pages
- Parses product cards from grid layout
- Normalizes condition names
- Handles multiple languages

## Database Schema

### raw_prices Table

Append-only table storing all scraped price data:

```sql
- id: Serial primary key
- card_name: Card name (indexed)
- card_set: Set name
- card_number: Collector number
- condition: Card condition
- language: 2-letter code (EN, DE, FR, etc.)
- price: Decimal price
- currency: Currency code (EUR)
- source: Marketplace name
- source_url: Product URL
- seller_name: Seller username
- seller_rating: Seller rating (0-5)
- stock_quantity: Available quantity
- scraped_at: Timestamp (indexed)
- created_at: Record creation time
```

### scrape_logs Table

Tracks scraping sessions:

```sql
- id: Serial primary key
- source: Scraper name
- status: success/failed/partial
- items_scraped: Count of items
- errors_count: Number of errors
- started_at: Start timestamp
- completed_at: End timestamp
- duration_seconds: Duration
- error_message: Error details
```

## Usage

### Running the Scraper

```bash
# Start via Docker Compose
docker compose up -d scraper

# View logs
docker compose logs -f scraper

# Run manually
docker compose exec scraper python -m app.main
```

### Monitoring

```bash
# Check scrape logs
docker compose exec postgres psql -U pokemon_user -d pokemon_intel \
  -c "SELECT * FROM scrape_logs ORDER BY started_at DESC LIMIT 10;"

# Check recent prices
docker compose exec postgres psql -U pokemon_user -d pokemon_intel \
  -c "SELECT card_name, price, source, scraped_at FROM raw_prices ORDER BY scraped_at DESC LIMIT 20;"

# Get scraping statistics
docker compose exec postgres psql -U pokemon_user -d pokemon_intel \
  -c "SELECT source, COUNT(*) as total, AVG(price) as avg_price FROM raw_prices WHERE scraped_at > NOW() - INTERVAL '24 hours' GROUP BY source;"
```

## Adding New Scrapers

1. **Create scraper class** inheriting from `BaseScraper`:

```python
# app/scrapers/example.py
from app.scrapers.base import BaseScraper

class ExampleScraper(BaseScraper):
    def __init__(self):
        super().__init__()
        self.source_name = "ExampleStore"
        
    async def scrape(self) -> List[Dict[str, Any]]:
        # Implementation
        pass
        
    async def parse(self, html: str) -> List[Dict[str, Any]]:
        # Parsing logic
        pass
        
    async def save(self, data: List[Dict[str, Any]]) -> None:
        # Save to database
        pass
```

2. **Register in main.py**:

```python
from app.scrapers.example import ExampleScraper

# In ScraperService.__init__
if settings.EXAMPLE_ENABLED:
    self.scrapers.append(ExampleScraper())
```

3. **Add configuration**:

```env
EXAMPLE_ENABLED=true
```

## Rate Limiting

The scraper uses a token bucket algorithm:

```python
from app.utils.rate_limiter import RateLimiter

rate_limiter = RateLimiter(
    max_calls=30,  # 30 requests
    period=60       # per 60 seconds
)

await rate_limiter.acquire()  # Blocks if limit exceeded
```

## Retry Logic

Automatic retries with exponential backoff:

```python
from app.utils.retry import retry_with_backoff

@retry_with_backoff(max_retries=3, base_delay=2.0)
async def scrape_page(url):
    # Will retry 3 times with delays: 2s, 4s, 8s
    return await fetch(url)
```

## Proxy Configuration

For production, use EU proxies to avoid rate limiting:

```python
from app.utils.proxy_manager import proxy_manager

# Get proxy for request
proxy = proxy_manager.get_proxy()

# Use with Playwright
browser = await playwright.chromium.launch(proxy=proxy)
```

**Recommended Proxy Providers**:
- Bright Data (https://brightdata.com/)
- Smartproxy (https://smartproxy.com/)
- Oxylabs (https://oxylabs.io/)

## Troubleshooting

### Scraper not finding data

```bash
# Enable debug logging
LOG_LEVEL=DEBUG

# Check HTML structure
docker compose exec scraper python -c "
from app.scrapers.cardmarket import CardMarketScraper
import asyncio
async def test():
    scraper = CardMarketScraper()
    await scraper.setup_browser()
    html = await scraper.get_html('https://www.cardmarket.com/...')
    print(html)
asyncio.run(test())
"
```

### Rate limit errors

```env
# Reduce request rate
REQUESTS_PER_MINUTE=15
CONCURRENT_REQUESTS=1

# Add delays
RETRY_DELAY=10
```

### Playwright issues on ARM (M1/M2 Mac)

The scraper gracefully handles Playwright installation failures and will still work for basic HTTP requests with BeautifulSoup.

For full browser automation on ARM:
```bash
# Use Chromium fallback
playwright install chromium --with-deps
```

## Performance

- **Scraping Speed**: ~10-30 cards/minute per source (rate limited)
- **Memory Usage**: ~200-400 MB per scraper
- **Database Growth**: ~100-500 MB/day depending on frequency

## Legal & Ethical Considerations

- ✅ Respects robots.txt
- ✅ Rate limiting to avoid overloading servers
- ✅ User-Agent identification
- ✅ Only public data
- ⚠️ Review each marketplace's Terms of Service
- ⚠️ Consider using official APIs when available

## Future Enhancements

- [ ] API-based scrapers (when available)
- [ ] Image scraping for card images
- [ ] Advanced proxy rotation
- [ ] Captcha handling
- [ ] Real-time price change detection
- [ ] Multi-region support (US, Asia)
- [ ] Notification system for alerts
