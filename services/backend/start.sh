#!/bin/bash
# Railway startup script - runs migrations then starts the server

PORT=${PORT:-8000}

echo "Running database migrations..."
alembic upgrade head

echo "Starting FastAPI on port $PORT"
uvicorn app.main:app --host 0.0.0.0 --port $PORT
