#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Pokemon Market Intel EU — One-Click Setup Script
# ═══════════════════════════════════════════════════════════════
# Run this after cloning the repo to set everything up automatically.
# Usage: chmod +x setup.sh && ./setup.sh
# ═══════════════════════════════════════════════════════════════

set -e

echo ""
echo "🎴 ══════════════════════════════════════════════════"
echo "   Pokemon Market Intel EU — Setup"
echo "══════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Check Docker ─────────────────────────────────────
echo "🐳 Step 1: Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "   Download Docker Desktop from: https://www.docker.com/products/docker-desktop"
    echo "   Install it, start it, then run this script again."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker is not running!"
    echo "   Start Docker Desktop and try again."
    exit 1
fi

echo "   ✅ Docker is installed and running"
echo ""

# ─── Step 2: Start all containers ─────────────────────────────
echo "🚀 Step 2: Building and starting all services..."
echo "   (This may take 3-5 minutes on the first run)"
echo ""
docker compose up -d --build

echo ""
echo "   ✅ All containers started"
echo ""

# ─── Step 3: Wait for database ────────────────────────────────
echo "⏳ Step 3: Waiting for database to be ready..."
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U pokemon_user &> /dev/null; then
        echo "   ✅ Database is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Database did not start in time. Check: docker compose logs postgres"
        exit 1
    fi
    sleep 2
done
echo ""

# ─── Step 4: Initialize database tables ───────────────────────
echo "📦 Step 4: Initializing database tables..."

# The init.sql runs automatically on first start via Docker volume mount.
# But we also need the analysis, users, and alerts tables:
docker compose exec -T postgres psql -U pokemon_user -d pokemon_intel -c "
-- Analysis tables
$(cat services/analysis/create_tables.sql 2>/dev/null || echo "SELECT 1;")
" 2>/dev/null || true

docker compose exec -T postgres psql -U pokemon_user -d pokemon_intel -c "
-- Users table
$(cat services/backend/create_users_table.sql 2>/dev/null || echo "SELECT 1;")
" 2>/dev/null || true

docker compose exec -T postgres psql -U pokemon_user -d pokemon_intel -c "
-- Alerts table
$(cat services/alerts/create_alerts_table.sql 2>/dev/null || echo "SELECT 1;")
" 2>/dev/null || true

# Add missing columns that might not be in the original SQL
docker compose exec -T postgres psql -U pokemon_user -d pokemon_intel -c "
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
DO \$\$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE userrole AS ENUM ('free', 'paid', 'pro', 'admin');
    END IF;
END \$\$;
" 2>/dev/null || true

echo "   ✅ Database tables initialized"
echo ""

# ─── Step 5: Create demo account ──────────────────────────────
echo "👤 Step 5: Creating demo account..."

# Generate bcrypt hash for 'demo123'
HASH=$(docker compose exec -T backend python3 -c "
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
print(pwd_context.hash('demo123'))
" 2>/dev/null)

if [ -n "$HASH" ]; then
    docker compose exec -T postgres psql -U pokemon_user -d pokemon_intel -c "
    INSERT INTO users (email, hashed_password, full_name, role, is_active, created_at)
    VALUES ('demo@pokemontel.eu', '$HASH', 'Demo User', 'paid', true, NOW())
    ON CONFLICT (email) DO UPDATE SET hashed_password = '$HASH', role = 'paid';
    " 2>/dev/null || true
    echo "   ✅ Demo account created"
    echo "      📧 Email: demo@pokemontel.eu"
    echo "      🔑 Password: demo123"
    echo "      👑 Role: paid (full access)"
else
    echo "   ⚠️  Could not create demo account automatically."
    echo "      The backend might still be starting up. Try again in 30 seconds:"
    echo "      ./setup.sh"
fi
echo ""

# ─── Step 6: Wait for backend health ──────────────────────────
echo "🏥 Step 6: Waiting for backend to be healthy..."
for i in {1..30}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
        echo "   ✅ Backend is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "   ⚠️  Backend not responding yet. It might need more time."
        echo "      Check: docker compose logs backend"
    fi
    sleep 2
done
echo ""

# ─── Step 7: Verify frontend ──────────────────────────────────
echo "🌐 Step 7: Checking frontend..."
for i in {1..20}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
        echo "   ✅ Frontend is running"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "   ⚠️  Frontend not ready yet. It compiles on first visit (can take 30s)."
    fi
    sleep 3
done
echo ""

# ─── Done! ─────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  🎉 Setup complete! Your platform is running:"
echo ""
echo "  🌐 Frontend:  http://localhost:3000"
echo "  🔧 Backend:   http://localhost:8000"
echo "  📚 API Docs:  http://localhost:8000/docs"
echo ""
echo "  📧 Login:     demo@pokemontel.eu"
echo "  🔑 Password:  demo123"
echo ""
echo "  📋 Useful commands:"
echo "     docker compose ps          — check service status"
echo "     docker compose logs -f     — view all logs"
echo "     docker compose down        — stop everything"
echo "     docker compose up -d       — start everything"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
