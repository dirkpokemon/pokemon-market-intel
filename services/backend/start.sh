#!/bin/bash
# Railway startup script

PORT=${PORT:-8000}

echo "=== Running database migrations ==="
alembic upgrade head || echo "WARNING: alembic upgrade failed — schema will be created via SQLAlchemy create_all on startup"

echo "=== Starting FastAPI on port $PORT ==="
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
