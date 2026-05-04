#!/bin/bash
set -e  # Exit immediately if any command fails — makes alembic errors visible

PORT=${PORT:-8000}

echo "=== Running database migrations ==="
alembic upgrade head
echo "=== Migrations complete ==="

echo "Starting FastAPI on port $PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
