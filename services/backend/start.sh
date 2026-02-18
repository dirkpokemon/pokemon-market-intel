#!/bin/bash
# Railway startup script - uses PORT env var or defaults to 8000

PORT=${PORT:-8000}

echo "Starting FastAPI on port $PORT"
uvicorn app.main:app --host 0.0.0.0 --port $PORT
