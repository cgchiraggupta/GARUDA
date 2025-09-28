const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const mockData = require('./mock-data');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// API Routes
app.get('/api/v1/routes', (req, res) => {
  console.log('📡 GET /api/v1/routes');
  res.json({
    success: true,
    data: mockData.mockRoutes,
    count: mockData.mockRoutes.length
  });
});

app.get('/api/v1/routes/:id', (req, res) => {
  const routeId = parseInt(req.params.id);
  const route = mockData.mockRoutes.find(r => r.id === routeId);
  
  if (!route) {
    return res.status(404).json({
      success: false,
      error: 'Route not found'
    });
  }
  
  res.json({
    success: true,
    data: route
  });
});

app.get('/api/v1/routes/:id/live', (req, res) => {
  const routeId = parseInt(req.params.id);
  const trains = mockData.mockTrains.filter(t => t.routeId === routeId);
  const defects = mockData.mockDefects.filter(d => d.route_id === routeId);
  const alerts = mockData.mockAlerts.filter(a => a.route_id === routeId);
  const sensorReadings = mockData.mockSensorReadings.filter(s => s.route_id === routeId);
  
  res.json({
    success: true,
    data: {
      trains,
      sensor_readings: sensorReadings,
      alerts
    }
  });
});

app.get('/api/v1/routes/:id/geometry', (req, res) => {
  const routeId = parseInt(req.params.id);
  const route = mockData.mockRoutes.find(r => r.id === routeId);
  
  if (!route) {
    return res.status(404).json({
      success: false,
      error: 'Route not found'
    });
  }
  
  const geometry = mockData.generateTrackGeometry(routeId, route.distance_km);
  
  res.json({
    success: true,
    data: geometry,
    count: geometry.length
  });
});

app.get('/api/v1/routes/:id/defects', (req, res) => {
  const routeId = parseInt(req.params.id);
  const defects = mockData.mockDefects.filter(d => d.route_id === routeId);
  
  res.json({
    success: true,
    data: defects,
    count: defects.length
  });
});

app.get('/api/v1/defects/active', (req, res) => {
  res.json({
    success: true,
    data: mockData.mockDefects,
    count: mockData.mockDefects.length
  });
});

app.get('/api/v1/alerts', (req, res) => {
  res.json({
    success: true,
    data: mockData.mockAlerts,
    count: mockData.mockAlerts.length
  });
});

app.get('/api/v1/analytics/dashboard', (req, res) => {
  const systemStats = {
    total_routes: mockData.mockRoutes.length,
    total_defects: mockData.mockDefects.length,
    critical_defects: mockData.mockDefects.filter(d => d.severity === 'critical').length,
    high_defects: mockData.mockDefects.filter(d => d.severity === 'high').length,
    scheduled_maintenance: mockData.mockRoutes.reduce((sum, r) => sum + r.scheduled_maintenance, 0),
    active_alerts: mockData.mockAlerts.filter(a => a.status === 'active').length,
    total_track_length: mockData.mockRoutes.reduce((sum, r) => sum + r.distance_km, 0)
  };
  
  res.json({
    success: true,
    data: {
      system_stats: systemStats,
      recent_activity: [],
      performance_metrics: [],
      generated_at: new Date().toISOString()
    }
  });
});

// WebSocket setup
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  const clientInfo = {
    id: clientId,
    ws: ws,
    subscriptions: new Set(),
    lastPing: Date.now(),
    ip: req.socket.remoteAddress
  };

  clients.set(clientId, clientInfo);
  console.log(`🔌 WebSocket client connected: ${clientId}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    clientId: clientId,
    timestamp: new Date().toISOString(),
    message: 'Connected to ITMS WebSocket server'
  }));

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleWebSocketMessage(clientId, message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid JSON message'
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log(`🔌 WebSocket client disconnected: ${clientId}`);
    clients.delete(clientId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    clients.delete(clientId);
    });
  });
  
function handleWebSocketMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'subscribe':
      client.subscriptions.add(message.topic);
      console.log(`Client ${clientId} subscribed to: ${message.topic}`);
      break;
    case 'unsubscribe':
      client.subscriptions.delete(message.topic);
      console.log(`Client ${clientId} unsubscribed from: ${message.topic}`);
      break;
    case 'ping':
      client.ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
      break;
  }
}

function broadcastToTopic(topic, data) {
  const message = JSON.stringify({
    type: 'topic_update',
    topic: topic,
    data: data,
    timestamp: new Date().toISOString()
  });

  clients.forEach(client => {
    if (client.subscriptions.has(topic) && client.ws.readyState === 1) {
      client.ws.send(message);
    }
  });
}

// Simulation engine
let simulationInterval;

function startSimulation() {
  console.log('🚂 Starting ITMS simulation engine...');
  
  simulationInterval = setInterval(() => {
    // Update train positions
    mockData.mockTrains.forEach(train => {
      const speedKmPerSecond = train.speed / 3600;
      const distanceMoved = speedKmPerSecond * 2; // 2 second interval
      
      if (train.direction === 'forward') {
        train.chainage += distanceMoved;
      } else {
        train.chainage -= distanceMoved;
      }
      
      // Reverse direction at route ends
      const route = mockData.mockRoutes.find(r => r.id === train.routeId);
      if (route) {
        if (train.chainage >= route.distance_km) {
          train.chainage = route.distance_km;
          train.direction = 'backward';
        } else if (train.chainage <= 0) {
          train.chainage = 0;
          train.direction = 'forward';
        }
      }
      
      train.timestamp = new Date().toISOString();
    });
    
    // Broadcast train updates
    mockData.mockTrains.forEach(train => {
      broadcastToTopic('train-tracking', {
        trainId: train.id,
        routeId: train.routeId,
        routeName: train.routeName,
        latitude: train.latitude,
        longitude: train.longitude,
        chainage: train.chainage,
        speed: train.speed,
        direction: train.direction,
        timestamp: train.timestamp
  });
});
    
    // Generate random sensor data
    if (Math.random() < 0.3) { // 30% chance
      const route = mockData.mockRoutes[Math.floor(Math.random() * mockData.mockRoutes.length)];
      const sensorData = {
        routeId: route.id,
        routeName: route.name,
        chainage_km: Math.random() * route.distance_km,
        acceleration_x: (Math.random() - 0.5) * 2,
        acceleration_y: (Math.random() - 0.5) * 2,
        acceleration_z: (Math.random() - 0.5) * 2,
        vibration_level: Math.random() * 3,
        temperature_celsius: 20 + Math.random() * 30,
        humidity_percent: 40 + Math.random() * 40,
        timestamp: new Date().toISOString()
      };
      
      broadcastToTopic('sensor-data', sensorData);
    }
    
    // Generate random alerts
    if (Math.random() < 0.05) { // 5% chance
      const route = mockData.mockRoutes[Math.floor(Math.random() * mockData.mockRoutes.length)];
      const alertTypes = [
        { type: 'speed_restriction', message: 'Speed restriction due to track maintenance', severity: 'warning' },
        { type: 'weather_alert', message: 'Heavy rain affecting track conditions', severity: 'info' },
        { type: 'maintenance_due', message: 'Scheduled maintenance due in 7 days', severity: 'info' }
      ];
      
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const alert = {
        type: alertType.type,
        severity: alertType.severity,
        message: alertType.message,
        routeId: route.id,
        routeName: route.name,
        chainage: Math.random() * route.distance_km,
        latitude: 28.644800 + (Math.random() - 0.5) * 0.1,
        longitude: 77.216721 + (Math.random() - 0.5) * 0.1,
        timestamp: new Date().toISOString()
      };
      
      broadcastToTopic('alerts', alert);
    }
    
  }, 2000); // Update every 2 seconds
  
  console.log('✅ Simulation engine started');
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚂 ITMS Backend Server running on port ${PORT}`);
  console.log(`📡 WebSocket server available at ws://localhost:${PORT}/ws`);
  console.log(`🌐 API available at http://localhost:${PORT}/api`);
  
  // Start simulation
  startSimulation();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});