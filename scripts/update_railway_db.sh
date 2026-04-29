#!/usr/bin/env bash
# Usage: ./scripts/update_railway_db.sh <new_railway_postgres_url>
# Example: ./scripts/update_railway_db.sh "postgresql://postgres:pass@postgres.railway.internal:5432/railway"
#
# Converts postgresql:// → postgresql+asyncpg:// and sets DATABASE_URL
# on all four Railway services.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <postgresql://...>"
  exit 1
fi

RAW_URL="$1"

# Ensure the URL uses the asyncpg driver prefix required by SQLAlchemy async
if [[ "$RAW_URL" == postgresql://* ]]; then
  ASYNC_URL="postgresql+asyncpg://${RAW_URL#postgresql://}"
elif [[ "$RAW_URL" == postgresql+asyncpg://* ]]; then
  ASYNC_URL="$RAW_URL"
else
  echo "❌ URL must start with postgresql:// or postgresql+asyncpg://"
  exit 1
fi

SERVICES=(
  "pokemon-market-intel"
  "Scraper"
  "analysis"
  "charming-contentment"   # frontend doesn't need DB but set for safety
)

echo "🔄 Updating DATABASE_URL on all Railway services..."
echo "   Async URL: ${ASYNC_URL:0:60}..."

for SERVICE in "${SERVICES[@]}"; do
  echo -n "   → $SERVICE ... "
  railway variables set DATABASE_URL="$ASYNC_URL" \
    --service "$SERVICE" \
    --environment production 2>/dev/null && echo "✅" || echo "⚠️  (skipped or no DB var needed)"
done

echo ""
echo "✅ Done. Railway will redeploy each service."
echo "   After redeploy, run migrations: ./scripts/migrate.sh upgrade"
