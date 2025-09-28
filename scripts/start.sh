#!/bin/bash

# ITMS Start Script
# Quick start for development

set -e

echo "🚂 Starting ITMS Development Environment"
echo "======================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Environment file not found. Please run setup.sh first."
    exit 1
fi

# Start with Docker Compose
echo "🐳 Starting services with Docker Compose..."
docker-compose up -d

echo "⏳ Waiting for services to initialize..."
sleep 15

# Check service health
echo "🔍 Checking service health..."

# Check backend health
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "⚠️  Backend API is starting up..."
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "⚠️  Frontend is starting up..."
fi

echo ""
echo "🎉 ITMS is starting up!"
echo "======================"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:8000"
echo "📊 Database: localhost:5432"
echo ""
echo "📋 Service Status:"
docker-compose ps
echo ""
echo "🔧 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"
echo ""
echo "Happy monitoring! 🚂"
