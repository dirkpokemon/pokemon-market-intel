#!/bin/bash

# Development Helper Script
# Provides common development commands

set -e

COMMAND=${1:-"help"}

case $COMMAND in
    "start")
        echo "🚀 Starting all services..."
        docker-compose up -d
        echo "✅ Services started"
        docker-compose ps
        ;;
    
    "stop")
        echo "🛑 Stopping all services..."
        docker-compose down
        echo "✅ Services stopped"
        ;;
    
    "restart")
        echo "🔄 Restarting all services..."
        docker-compose restart
        echo "✅ Services restarted"
        ;;
    
    "logs")
        SERVICE=${2:-""}
        if [ -z "$SERVICE" ]; then
            docker-compose logs -f
        else
            docker-compose logs -f $SERVICE
        fi
        ;;
    
    "shell")
        SERVICE=${2:-"backend"}
        echo "🐚 Opening shell in $SERVICE..."
        docker-compose exec $SERVICE /bin/sh
        ;;
    
    "clean")
        echo "🧹 Cleaning up Docker resources..."
        docker-compose down -v
        docker system prune -f
        echo "✅ Cleanup complete"
        ;;
    
    "rebuild")
        SERVICE=${2:-""}
        if [ -z "$SERVICE" ]; then
            echo "🔨 Rebuilding all services..."
            docker-compose build --no-cache
        else
            echo "🔨 Rebuilding $SERVICE..."
            docker-compose build --no-cache $SERVICE
        fi
        echo "✅ Rebuild complete"
        ;;
    
    "test")
        SERVICE=${2:-"backend"}
        echo "🧪 Running tests for $SERVICE..."
        docker-compose exec $SERVICE pytest
        ;;
    
    "lint")
        SERVICE=${2:-"backend"}
        echo "🔍 Running linter for $SERVICE..."
        if [ "$SERVICE" = "backend" ] || [ "$SERVICE" = "scraper" ] || [ "$SERVICE" = "analysis" ]; then
            docker-compose exec $SERVICE ruff check .
        elif [ "$SERVICE" = "frontend" ]; then
            docker-compose exec $SERVICE npm run lint
        fi
        ;;
    
    "format")
        SERVICE=${2:-"backend"}
        echo "✨ Formatting code for $SERVICE..."
        if [ "$SERVICE" = "backend" ] || [ "$SERVICE" = "scraper" ] || [ "$SERVICE" = "analysis" ]; then
            docker-compose exec $SERVICE black .
        fi
        ;;
    
    "db")
        echo "🗄️  Connecting to database..."
        docker-compose exec postgres psql -U pokemon_user -d pokemon_intel
        ;;
    
    *)
        echo "Pokemon Market Intelligence EU - Development Helper"
        echo ""
        echo "Usage: ./dev.sh [command] [args]"
        echo ""
        echo "Commands:"
        echo "  start              Start all services"
        echo "  stop               Stop all services"
        echo "  restart            Restart all services"
        echo "  logs [service]     View logs (all or specific service)"
        echo "  shell [service]    Open shell in service (default: backend)"
        echo "  clean              Clean up Docker resources"
        echo "  rebuild [service]  Rebuild images (all or specific)"
        echo "  test [service]     Run tests (default: backend)"
        echo "  lint [service]     Run linter (default: backend)"
        echo "  format [service]   Format code (default: backend)"
        echo "  db                 Connect to PostgreSQL database"
        echo ""
        echo "Examples:"
        echo "  ./dev.sh start"
        echo "  ./dev.sh logs backend"
        echo "  ./dev.sh shell frontend"
        echo "  ./dev.sh rebuild scraper"
        ;;
esac
