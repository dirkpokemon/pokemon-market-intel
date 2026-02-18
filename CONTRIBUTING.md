# Contributing Guide

## Development Setup

### Prerequisites

- Docker 24.0+
- Docker Compose 2.20+
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local Python development)

### Initial Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd pokemon-market-intel
```

2. Run the setup script:
```bash
./scripts/setup.sh
```

This will:
- Create all necessary `.env` files
- Build Docker images
- Initialize the database
- Start all services

3. Verify services are running:
```bash
docker-compose ps
```

## Development Workflow

### Starting Development

```bash
# Start all services
./scripts/dev.sh start

# View logs
./scripts/dev.sh logs

# View logs for specific service
./scripts/dev.sh logs backend
```

### Making Changes

#### Backend Development

```bash
# Open shell in backend container
./scripts/dev.sh shell backend

# Run tests
./scripts/dev.sh test backend

# Format code
./scripts/dev.sh format backend

# Run linter
./scripts/dev.sh lint backend
```

#### Frontend Development

```bash
# Open shell in frontend container
./scripts/dev.sh shell frontend

# Inside container:
npm run dev     # Development server with hot reload
npm run build   # Production build
npm run lint    # Run ESLint
```

#### Database Changes

```bash
# Create migration after modifying models
./scripts/migrate.sh create "description_of_changes"

# Apply migrations
./scripts/migrate.sh upgrade

# View migration history
./scripts/migrate.sh history

# Rollback migration
./scripts/migrate.sh downgrade 1
```

### Code Style

#### Python Services (Backend, Scraper, Analysis)

- **Formatter**: Black (line length: 88)
- **Linter**: Ruff
- **Type hints**: Required for function signatures
- **Docstrings**: Required for public functions

```python
async def get_user_by_email(email: str) -> User | None:
    """
    Retrieve user by email address.
    
    Args:
        email: User's email address
        
    Returns:
        User object if found, None otherwise
    """
    # Implementation
```

#### Frontend (TypeScript/React)

- **Formatter**: ESLint + Prettier (via Next.js)
- **Style**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions
- **Types**: Explicit types for props and state

```typescript
interface PriceChartProps {
  data: PriceHistory;
  timeRange: string;
}

export function PriceChart({ data, timeRange }: PriceChartProps) {
  // Implementation
}
```

## Project Structure

### Adding New Features

#### 1. Backend API Endpoint

1. Create Pydantic schema in `services/backend/app/schemas/`
2. Add route handler in `services/backend/app/api/`
3. Include router in `services/backend/app/main.py`
4. Write tests

Example:
```python
# schemas/card.py
from pydantic import BaseModel

class CardResponse(BaseModel):
    id: int
    name: str
    set: str

# api/cards.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/cards/{card_id}", response_model=CardResponse)
async def get_card(card_id: int):
    # Implementation
    pass
```

#### 2. Scraper Implementation

1. Create scraper class inheriting from `BaseScraper`
2. Implement `scrape()`, `parse()`, and `save()` methods
3. Register in scheduler in `services/scraper/app/main.py`

Example:
```python
# scrapers/example_store.py
from app.scrapers.base import BaseScraper

class ExampleStoreScraper(BaseScraper):
    async def scrape(self):
        html = await self.get_html("https://example.com/pokemon")
        data = await self.parse(html)
        await self.save(data)
        
    async def parse(self, html):
        soup = self.parse_html(html)
        # Parse logic
        
    async def save(self, data):
        # Save to database
```

#### 3. Analysis Calculator

1. Create calculator class inheriting from `BaseCalculator`
2. Implement `calculate()` and `save_results()` methods
3. Schedule in `services/analysis/app/main.py`

Example:
```python
# calculators/market_stats.py
from app.calculators.base import BaseCalculator

class MarketStatsCalculator(BaseCalculator):
    async def calculate(self):
        data = await self.fetch_data("SELECT * FROM raw_prices")
        # Analysis logic
        results = [...]
        await self.save_results(results)
        
    async def save_results(self, results):
        # Save to database
```

#### 4. Frontend Component

1. Create component in `services/frontend/src/components/`
2. Add types in `services/frontend/src/types/`
3. Use TailwindCSS for styling
4. Import and use in pages

Example:
```typescript
// components/DealCard.tsx
import { DealScore } from '@/types';

interface DealCardProps {
  deal: DealScore;
}

export function DealCard({ deal }: DealCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold">{deal.card_name}</h3>
      <p className="text-2xl font-bold text-green-600">
        €{deal.current_price}
      </p>
    </div>
  );
}
```

## Testing

### Backend Tests

```bash
# Run all tests
./scripts/dev.sh test backend

# Run specific test file
docker-compose exec backend pytest tests/test_auth.py

# Run with coverage
docker-compose exec backend pytest --cov=app --cov-report=html
```

### Frontend Tests

```bash
# Run tests (when implemented)
docker-compose exec frontend npm test
```

## Debugging

### Backend Debugging

1. Add print statements or use structured logging:
```python
from app.config import settings
import structlog

logger = structlog.get_logger()

logger.info("user_logged_in", user_id=user.id)
```

2. View logs:
```bash
./scripts/dev.sh logs backend
```

### Frontend Debugging

1. Use browser DevTools
2. Add console.log statements
3. View logs:
```bash
./scripts/dev.sh logs frontend
```

### Database Debugging

1. Connect to database:
```bash
./scripts/dev.sh db
```

2. Run SQL queries:
```sql
SELECT * FROM users LIMIT 10;
```

## Pull Request Process

1. Create feature branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make changes and commit:
```bash
git add .
git commit -m "feat: add new feature"
```

3. Ensure tests pass:
```bash
./scripts/dev.sh test backend
```

4. Format code:
```bash
./scripts/dev.sh format backend
./scripts/dev.sh lint backend
```

5. Push and create PR:
```bash
git push origin feature/your-feature-name
```

## Commit Message Convention

Follow Conventional Commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Build process or auxiliary tool changes

Examples:
```
feat: add deal score calculation
fix: resolve authentication token expiry
docs: update API documentation
refactor: optimize database queries
```

## Questions or Issues?

- Create an issue on GitHub
- Contact the maintainers
- Check the documentation in `/docs`
