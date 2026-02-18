#!/bin/bash

# Database Migration Script
# Manages Alembic migrations for the backend database

set -e

echo "📊 Pokemon Market Intelligence EU - Database Migration"
echo "======================================================"

# Check if Docker Compose is running
if ! docker-compose ps | grep -q "backend"; then
    echo "❌ Backend service is not running. Start services first with: docker-compose up -d"
    exit 1
fi

# Parse command
COMMAND=${1:-"upgrade"}

case $COMMAND in
    "upgrade")
        echo "⬆️  Applying all pending migrations..."
        docker-compose exec backend alembic upgrade head
        echo "✅ Migrations applied successfully"
        ;;
    
    "downgrade")
        STEPS=${2:-1}
        echo "⬇️  Reverting $STEPS migration(s)..."
        docker-compose exec backend alembic downgrade -$STEPS
        echo "✅ Migrations reverted successfully"
        ;;
    
    "create")
        MESSAGE=${2:-"migration"}
        echo "📝 Creating new migration: $MESSAGE"
        docker-compose exec backend alembic revision --autogenerate -m "$MESSAGE"
        echo "✅ Migration created successfully"
        ;;
    
    "history")
        echo "📜 Migration history:"
        docker-compose exec backend alembic history
        ;;
    
    "current")
        echo "📍 Current migration:"
        docker-compose exec backend alembic current
        ;;
    
    "reset")
        echo "⚠️  WARNING: This will reset the entire database!"
        read -p "Are you sure? (yes/no): " CONFIRM
        if [ "$CONFIRM" = "yes" ]; then
            echo "🔄 Resetting database..."
            docker-compose exec backend alembic downgrade base
            docker-compose exec backend alembic upgrade head
            echo "✅ Database reset complete"
        else
            echo "❌ Reset cancelled"
        fi
        ;;
    
    *)
        echo "Usage: ./migrate.sh [command] [args]"
        echo ""
        echo "Commands:"
        echo "  upgrade              Apply all pending migrations (default)"
        echo "  downgrade [n]        Revert n migrations (default: 1)"
        echo "  create [message]     Create new migration"
        echo "  history              Show migration history"
        echo "  current              Show current migration"
        echo "  reset                Reset database (downgrade all, then upgrade all)"
        exit 1
        ;;
esac
