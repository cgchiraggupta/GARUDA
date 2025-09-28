#!/bin/bash

# ITMS Setup Script
# Indigenous Track Monitoring System - SIH 2025

set -e

echo "🚂 Setting up Indigenous Track Monitoring System (ITMS)"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp env.example .env
    echo "✅ Environment file created from template"
else
    echo "✅ Environment file already exists"
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "✅ Dependencies installed successfully"

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose build

echo "✅ Docker images built successfully"

# Start the application
echo "🚀 Starting ITMS application..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

# Seed the database
echo "🌱 Seeding database with Indian railway data..."
cd backend
npm run seed
cd ..

echo ""
echo "🎉 ITMS Setup Complete!"
echo "======================"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:8000"
echo "📊 Database: localhost:5432"
echo ""
echo "🔧 Useful Commands:"
echo "  docker-compose logs -f          # View logs"
echo "  docker-compose down             # Stop services"
echo "  docker-compose restart          # Restart services"
echo "  docker-compose exec backend npm run seed  # Re-seed database"
echo ""
echo "📚 Documentation: README.md"
echo "🎯 Demo Script: docs/demo-script.md"
echo ""
echo "Happy monitoring! 🚂"
