# 🚀 ITMS Deployment Guide

## 📋 Prerequisites

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+), macOS, or Windows 10+
- **RAM**: Minimum 8GB, Recommended 16GB
- **Storage**: Minimum 20GB free space
- **CPU**: Multi-core processor (4+ cores recommended)
- **Network**: Stable internet connection

### Software Requirements
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Node.js**: Version 18+ (for development)
- **Git**: Latest version
- **Web Browser**: Chrome, Firefox, Safari, or Edge

---

## 🐳 Quick Start with Docker (Recommended)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd itms-demo
```

### 2. Start the System
```bash
# Start all services
docker-compose up --build

# Or run in background
docker-compose up --build -d
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs
- **Health Check**: http://localhost:8000/health

### 4. Verify Installation
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Check database connection
docker-compose exec backend npm run test:db
```

---

## 🛠️ Development Setup

### 1. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit configuration
nano .env
```

### 3. Database Setup
```bash
# Start database only
docker-compose up database -d

# Run migrations
cd backend && npm run migrate

# Seed with sample data
npm run seed
```

### 4. Start Development Servers
```bash
# Start all services in development mode
npm run dev

# Or start individually
# Backend (Terminal 1)
cd backend && npm run dev

# Frontend (Terminal 2)
cd frontend && npm run dev
```

---

## 🗄️ Database Configuration

### PostgreSQL Setup
```sql
-- Create database
CREATE DATABASE itms_demo;

-- Create user
CREATE USER railway_user WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE itms_demo TO railway_user;
```

### Database Initialization
```bash
# Run initialization script
docker-compose exec database psql -U railway_user -d itms_demo -f /docker-entrypoint-initdb.d/init.sql

# Seed with sample data
docker-compose exec backend npm run seed
```

### Database Backup
```bash
# Create backup
docker-compose exec database pg_dump -U railway_user itms_demo > backup.sql

# Restore backup
docker-compose exec -T database psql -U railway_user itms_demo < backup.sql
```

---

## 🌐 Production Deployment

### 1. Environment Configuration
```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=postgresql://user:password@db-host:5432/itms_prod
JWT_SECRET=your_secure_jwt_secret
CORS_ORIGIN=https://your-domain.com
```

### 2. SSL/TLS Configuration
```bash
# Generate SSL certificates
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Update docker-compose.yml for HTTPS
# Add SSL configuration to nginx or load balancer
```

### 3. Production Build
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Monitoring Setup
```bash
# Install monitoring tools
docker-compose -f docker-compose.monitoring.yml up -d

# Configure log aggregation
# Set up alerting rules
# Configure performance monitoring
```

---

## 🔧 Configuration Options

### Backend Configuration
```javascript
// config/database.js
module.exports = {
  development: {
    host: 'localhost',
    port: 5432,
    database: 'itms_demo',
    username: 'railway_user',
    password: 'secure_password'
  },
  production: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: true
  }
};
```

### Frontend Configuration
```javascript
// src/config/api.js
export const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  wsURL: process.env.REACT_APP_WS_URL || 'ws://localhost:8000',
  timeout: 10000,
  retries: 3
};
```

### Simulation Configuration
```javascript
// backend/config/simulation.js
module.exports = {
  speed: process.env.SIMULATION_SPEED || 1.0,
  dataRetentionDays: process.env.DATA_RETENTION_DAYS || 90,
  alertThresholds: {
    gauge: process.env.ALERT_THRESHOLD_GAUGE || 5.0,
    alignment: process.env.ALERT_THRESHOLD_ALIGNMENT || 10.0
  },
  maxTrainSpeed: process.env.MAX_TRAIN_SPEED || 160,
  samplingInterval: process.env.SAMPLING_INTERVAL_CM || 25
};
```

---

## 📊 Monitoring and Logging

### Application Monitoring
```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Monitor system resources
docker stats

# Check container health
docker-compose ps
```

### Database Monitoring
```sql
-- Check database connections
SELECT * FROM pg_stat_activity;

-- Monitor query performance
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC;

-- Check database size
SELECT pg_size_pretty(pg_database_size('itms_demo'));
```

### Performance Monitoring
```bash
# Install monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access monitoring dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001
# Node Exporter: http://localhost:9100
```

---

## 🔒 Security Configuration

### Network Security
```yaml
# docker-compose.yml security settings
services:
  backend:
    networks:
      - internal
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /var/run

networks:
  internal:
    driver: bridge
    internal: true
```

### Application Security
```javascript
// Security middleware configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
```

### Database Security
```sql
-- Create read-only user for monitoring
CREATE USER itms_monitor WITH PASSWORD 'monitor_password';
GRANT CONNECT ON DATABASE itms_demo TO itms_monitor;
GRANT USAGE ON SCHEMA public TO itms_monitor;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO itms_monitor;

-- Enable row-level security
ALTER TABLE train_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE defects ENABLE ROW LEVEL SECURITY;
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check database status
docker-compose ps database

# View database logs
docker-compose logs database

# Test connection
docker-compose exec backend npm run test:db
```

#### 2. WebSocket Connection Issues
```bash
# Check WebSocket server
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:8000

# Check firewall settings
sudo ufw status
```

#### 3. Frontend Build Issues
```bash
# Clear node modules
rm -rf frontend/node_modules
cd frontend && npm install

# Clear build cache
npm run build -- --no-cache
```

#### 4. Memory Issues
```bash
# Check memory usage
docker stats

# Increase memory limits
# Update docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_train_positions_route_timestamp ON train_positions(route_id, timestamp);
CREATE INDEX CONCURRENTLY idx_defects_route_severity ON defects(route_id, severity);
CREATE INDEX CONCURRENTLY idx_alerts_route_status ON alerts(route_id, status);

-- Analyze tables for query optimization
ANALYZE train_positions;
ANALYZE defects;
ANALYZE alerts;
```

#### 2. Application Optimization
```javascript
// Enable compression
app.use(compression());

// Configure caching
app.use(express.static('public', {
  maxAge: '1d',
  etag: true
}));

// Optimize database queries
const query = `
  SELECT * FROM train_positions 
  WHERE route_id = $1 AND timestamp > NOW() - INTERVAL '5 minutes'
  ORDER BY timestamp DESC 
  LIMIT 100
`;
```

---

## 📈 Scaling and Load Balancing

### Horizontal Scaling
```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/itms_demo

  frontend:
    deploy:
      replicas: 2
    environment:
      - REACT_APP_API_URL=http://backend:8000
```

### Load Balancer Configuration
```nginx
# nginx.conf
upstream backend {
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}

upstream frontend {
    server frontend1:3000;
    server frontend2:3000;
}

server {
    listen 80;
    server_name itms.example.com;
    
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🔄 Backup and Recovery

### Automated Backup
```bash
#!/bin/bash
# backup.sh

# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Database backup
docker-compose exec -T database pg_dump -U railway_user itms_demo > backups/$(date +%Y%m%d)/database.sql

# Application backup
docker-compose exec backend tar -czf - /app > backups/$(date +%Y%m%d)/application.tar.gz

# Upload to cloud storage
aws s3 cp backups/$(date +%Y%m%d)/ s3://itms-backups/$(date +%Y%m%d)/ --recursive
```

### Disaster Recovery
```bash
# Restore from backup
docker-compose exec -T database psql -U railway_user itms_demo < backup.sql

# Restore application
docker-compose exec backend tar -xzf application.tar.gz -C /

# Restart services
docker-compose restart
```

---

## 📞 Support and Maintenance

### Regular Maintenance Tasks
```bash
# Weekly maintenance script
#!/bin/bash

# Update system packages
apt update && apt upgrade -y

# Clean Docker images
docker system prune -f

# Backup database
./backup.sh

# Check system health
docker-compose ps
docker stats --no-stream

# Update application
git pull origin main
docker-compose up --build -d
```

### Health Checks
```bash
# Application health check
curl -f http://localhost:8000/health || exit 1

# Database health check
docker-compose exec database pg_isready -U railway_user

# WebSocket health check
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8000
```

---

**🎯 This deployment guide ensures a smooth and secure installation of the ITMS system for both development and production environments.**
