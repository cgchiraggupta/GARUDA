const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const routes = [
  {
    id: 1,
    name: 'Delhi-Mumbai Central',
    start_station: 'New Delhi',
    end_station: 'Mumbai Central',
    distance_km: 1384.0,
    track_gauge_mm: 1676,
    max_speed_kmh: 160,
    geometry_points: 5536,
    active_defects: 12,
    scheduled_maintenance: 3
  },
  {
    id: 2,
    name: 'Chennai-Bangalore',
    start_station: 'Chennai Central',
    end_station: 'Bangalore City',
    distance_km: 362.0,
    track_gauge_mm: 1676,
    max_speed_kmh: 120,
    geometry_points: 1448,
    active_defects: 5,
    scheduled_maintenance: 2
  }
];

const trains = [
  {
    id: 'TRAIN_1_1',
    routeId: 1,
    routeName: 'Delhi-Mumbai Central',
    latitude: 28.644800,
    longitude: 77.216721,
    chainage: 245.5,
    speed: 120,
    direction: 'forward',
    timestamp: new Date().toISOString()
  }
];

const defects = [
  {
    id: 1,
    route_id: 1,
    chainage_km: 245.5,
    defect_type: 'crack',
    severity: 'high',
    description: 'Longitudinal crack detected',
    confidence_score: 0.87,
    repair_priority: 2,
    estimated_repair_cost: 150000,
    detected_at: new Date().toISOString(),
    status: 'active',
    latitude: 28.644800,
    longitude: 77.216721
  }
];

const alerts = [
  {
    id: 1,
    route_id: 1,
    alert_type: 'speed_restriction',
    severity: 'warning',
    message: 'Speed restriction due to track maintenance',
    chainage_km: 245.5,
    latitude: 28.644800,
    longitude: 77.216721,
    status: 'active',
    created_at: new Date().toISOString()
  }
];

// Camera error tracking
const cameraErrors = [
  {
    id: 1,
    error_type: 'permission',
    message: 'Camera permission denied',
    route_id: 1,
    chainage_km: 245.5,
    latitude: 28.644800,
    longitude: 77.216721,
    severity: 'high',
    status: 'resolved',
    created_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    resolved_at: new Date(Date.now() - 240000).toISOString() // 4 minutes ago
  }
];

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/v1/routes', (req, res) => {
  res.json({ success: true, data: routes, count: routes.length });
});

app.get('/api/v1/routes/:id', (req, res) => {
  const routeId = parseInt(req.params.id);
  const route = routes.find(r => r.id === routeId);
  if (!route) {
    return res.status(404).json({ success: false, error: 'Route not found' });
  }
  res.json({ success: true, data: route });
});

app.get('/api/v1/routes/:id/live', (req, res) => {
  const routeId = parseInt(req.params.id);
  const routeTrains = trains.filter(t => t.routeId === routeId);
  const routeDefects = defects.filter(d => d.route_id === routeId);
  const routeAlerts = alerts.filter(a => a.route_id === routeId);
  
  res.json({
    success: true,
    data: {
      trains: routeTrains,
      sensor_readings: [],
      alerts: routeAlerts
    }
  });
});

app.get('/api/v1/defects/active', (req, res) => {
  res.json({ success: true, data: defects, count: defects.length });
});

// Endpoint to report new crack detections from camera
app.post('/api/v1/defects', (req, res) => {
  const { route_id, chainage_km, latitude, longitude, detections } = req.body;
  
  const newDefects = detections.map((detection, index) => ({
    id: defects.length + index + 1,
    route_id: route_id || 1,
    chainage_km: chainage_km || 0,
    defect_type: detection.defect_type || 'crack',
    severity: detection.severity || 'medium',
    description: detection.description || 'Crack detected by camera',
    confidence_score: detection.confidence_score || 0.8,
    repair_priority: detection.repair_priority || 3,
    estimated_repair_cost: detection.estimated_repair_cost || 100000,
    detected_at: new Date().toISOString(),
    status: 'active',
    latitude: latitude || 28.6139,
    longitude: longitude || 77.2090
  }));
  
  defects.push(...newDefects);
  
  // Broadcast new defects to WebSocket clients
  newDefects.forEach(defect => {
    const message = JSON.stringify({
      type: 'defect_detection',
      data: defect,
      timestamp: new Date().toISOString()
    });

    clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  });
  
  res.json({ success: true, data: newDefects, count: newDefects.length });
});

app.get('/api/v1/alerts', (req, res) => {
  res.json({ success: true, data: alerts, count: alerts.length });
});

// Camera error endpoints
app.get('/api/v1/camera-errors', (req, res) => {
  res.json({ success: true, data: cameraErrors, count: cameraErrors.length });
});

app.post('/api/v1/camera-errors', (req, res) => {
  const { error_type, message, route_id, chainage_km, latitude, longitude, severity } = req.body;
  
  const newError = {
    id: cameraErrors.length + 1,
    error_type,
    message,
    route_id: route_id || 1,
    chainage_km: chainage_km || 0,
    latitude: latitude || 28.6139,
    longitude: longitude || 77.2090,
    severity: severity || 'medium',
    status: 'active',
    created_at: new Date().toISOString(),
    resolved_at: null
  };
  
  cameraErrors.push(newError);
  
  // Broadcast error to WebSocket clients
  const errorMessage = JSON.stringify({
    type: 'camera_error',
    data: newError,
    timestamp: new Date().toISOString()
  });

  clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(errorMessage);
    }
  });
  
  res.json({ success: true, data: newError });
});

app.get('/api/v1/analytics/dashboard', (req, res) => {
  const activeCameraErrors = cameraErrors.filter(e => e.status === 'active');
  const recentCameraErrors = cameraErrors.filter(e => 
    new Date(e.created_at) > new Date(Date.now() - 3600000) // Last hour
  );
  
  res.json({
    success: true,
    data: {
      system_stats: {
        active_trains: trains.length,
        total_routes: routes.length,
        total_defects: defects.length,
        critical_defects: defects.filter(d => d.severity === 'critical').length,
        high_defects: defects.filter(d => d.severity === 'high').length,
        scheduled_maintenance: routes.reduce((sum, r) => sum + r.scheduled_maintenance, 0),
        active_alerts: alerts.filter(a => a.status === 'active').length,
        total_track_length: routes.reduce((sum, r) => sum + r.distance_km, 0),
        camera_errors: activeCameraErrors.length,
        recent_camera_errors: recentCameraErrors.length
      },
      recent_activity: [
        ...recentCameraErrors.map(error => ({
          type: 'camera_error',
          message: `Camera ${error.error_type} error: ${error.message}`,
          timestamp: error.created_at,
          severity: error.severity
        }))
      ],
      performance_metrics: [
        {
          metric: 'Camera Uptime',
          value: `${Math.max(0, 100 - (recentCameraErrors.length * 5))}%`,
          status: recentCameraErrors.length > 5 ? 'warning' : 'good'
        },
        {
          metric: 'Error Rate',
          value: `${recentCameraErrors.length}/hour`,
          status: recentCameraErrors.length > 3 ? 'warning' : 'good'
        }
      ],
      generated_at: new Date().toISOString()
    }
  });
});

// WebSocket
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('WebSocket client connected');
  
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to ITMS WebSocket server',
    timestamp: new Date().toISOString()
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket client disconnected');
  });
});

// Simulation
setInterval(() => {
  // Update train positions
  trains.forEach(train => {
    train.chainage += (train.speed / 3600) * 2; // 2 second interval
    if (train.chainage > 1384) train.chainage = 0;
    train.timestamp = new Date().toISOString();
  });

  // Broadcast updates
  const message = JSON.stringify({
    type: 'train_update',
    data: trains,
    timestamp: new Date().toISOString()
  });

  clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}, 2000);

// Start server
server.listen(PORT, () => {
  console.log(`🚂 ITMS Demo Server running on port ${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`🌐 API available at http://localhost:${PORT}/api`);
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
