#!/bin/bash

# Pokemon Market Intelligence EU - Setup Script
# This script sets up the development environment

set -e

echo "🎮 Pokemon Market Intelligence EU - Setup Script"
echo "================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create .env files from examples
echo ""
echo "📝 Setting up environment files..."

# Root .env for docker-compose
if [ ! -f .env ]; then
    cat > .env << EOF
POSTGRES_USER=pokemon_user
POSTGRES_PASSWORD=pokemon_password
POSTGRES_DB=pokemon_intel
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
    echo "✅ Created root .env file"
else
    echo "⚠️  Root .env file already exists, skipping"
fi

# Backend .env
if [ ! -f services/backend/.env ]; then
    cat > services/backend/.env << EOF
DATABASE_URL=postgresql+asyncpg://pokemon_user:pokemon_password@postgres:5432/pokemon_intel
JWT_SECRET=$(openssl rand -hex 32)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
DEBUG=true
EOF
    echo "✅ Created backend/.env file"
else
    echo "⚠️  Backend .env file already exists, skipping"
fi

# Scraper .env
if [ ! -f services/scraper/.env ]; then
    cat > services/scraper/.env << EOF
DATABASE_URL=postgresql+asyncpg://pokemon_user:pokemon_password@postgres:5432/pokemon_intel
SCRAPE_INTERVAL=60
PROXY_ENABLED=false
HEADLESS=true
EOF
    echo "✅ Created scraper/.env file"
else
    echo "⚠️  Scraper .env file already exists, skipping"
fi

# Analysis .env
if [ ! -f services/analysis/.env ]; then
    cat > services/analysis/.env << EOF
DATABASE_URL=postgresql+asyncpg://pokemon_user:pokemon_password@postgres:5432/pokemon_intel
ANALYSIS_SCHEDULE=0 * * * *
EOF
    echo "✅ Created analysis/.env file"
else
    echo "⚠️  Analysis .env file already exists, skipping"
fi

# Frontend .env
if [ ! -f services/frontend/.env ]; then
    cat > services/frontend/.env << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
    echo "✅ Created frontend/.env file"
else
    echo "⚠️  Frontend .env file already exists, skipping"
fi

# Build Docker images
echo ""
echo "🐳 Building Docker images..."
docker-compose build

# Start services
echo ""
echo "🚀 Starting services..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Run database migrations
echo ""
echo "📊 Running database migrations..."
docker-compose run --rm backend alembic upgrade head || echo "⚠️  No migrations to run yet"

# Start all services
echo ""
echo "🚀 Starting all services..."
docker-compose up -d

echo ""
echo "✅ Setup complete!"
echo ""
echo "Services available at:"
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  API Docs:    http://localhost:8000/docs"
echo "  PostgreSQL:  localhost:5432"
echo ""
echo "View logs with: docker-compose logs -f"
echo "Stop services with: docker-compose down"
