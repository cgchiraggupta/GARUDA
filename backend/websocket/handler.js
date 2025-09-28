const db = require('../database/connection');

class WebSocketHandler {
  constructor() {
    this.connectedClients = new Map();
    this.subscriptions = new Map();
  }

  handleConnection(socket, io) {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Store client connection
    this.connectedClients.set(socket.id, {
      socket: socket,
      subscriptions: new Set(),
      connectedAt: new Date()
    });

    // Handle subscription to train tracking
    socket.on('subscribe-train-tracking', (data) => {
      console.log(`🚂 Client ${socket.id} subscribed to train tracking for route: ${data.routeId}`);
      this.subscribeToTrainTracking(socket, data.routeId);
    });

    // Handle subscription to sensor data
    socket.on('subscribe-sensor-data', (data) => {
      console.log(`📡 Client ${socket.id} subscribed to sensor data for route: ${data.routeId}`);
      this.subscribeToSensorData(socket, data.routeId);
    });

    // Handle subscription to alerts
    socket.on('subscribe-alerts', (data) => {
      console.log(`⚠️ Client ${socket.id} subscribed to alerts for route: ${data.routeId}`);
      this.subscribeToAlerts(socket, data.routeId);
    });

    // Handle subscription to defects
    socket.on('subscribe-defects', (data) => {
      console.log(`🔍 Client ${socket.id} subscribed to defects for route: ${data.routeId}`);
      this.subscribeToDefects(socket, data.routeId);
    });

    // Handle unsubscription
    socket.on('unsubscribe', (data) => {
      console.log(`🔌 Client ${socket.id} unsubscribed from: ${data.type}`);
      this.unsubscribe(socket, data.type, data.routeId);
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      this.handleDisconnect(socket);
    });

    // Send initial connection confirmation
    socket.emit('connected', {
      clientId: socket.id,
      timestamp: new Date().toISOString(),
      availableSubscriptions: [
        'train-tracking',
        'sensor-data',
        'alerts',
        'defects'
      ]
    });
  }

  subscribeToTrainTracking(socket, routeId) {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.subscriptions.add(`train-tracking-${routeId}`);
      
      // Send current train positions
      this.sendCurrentTrainPositions(socket, routeId);
      
      socket.emit('subscription-confirmed', {
        type: 'train-tracking',
        routeId: routeId,
        timestamp: new Date().toISOString()
      });
    }
  }

  subscribeToSensorData(socket, routeId) {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.subscriptions.add(`sensor-data-${routeId}`);
      
      // Send recent sensor data
      this.sendRecentSensorData(socket, routeId);
      
      socket.emit('subscription-confirmed', {
        type: 'sensor-data',
        routeId: routeId,
        timestamp: new Date().toISOString()
      });
    }
  }

  subscribeToAlerts(socket, routeId) {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.subscriptions.add(`alerts-${routeId}`);
      
      // Send current active alerts
      this.sendActiveAlerts(socket, routeId);
      
      socket.emit('subscription-confirmed', {
        type: 'alerts',
        routeId: routeId,
        timestamp: new Date().toISOString()
      });
    }
  }

  subscribeToDefects(socket, routeId) {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.subscriptions.add(`defects-${routeId}`);
      
      // Send current active defects
      this.sendActiveDefects(socket, routeId);
      
      socket.emit('subscription-confirmed', {
        type: 'defects',
        routeId: routeId,
        timestamp: new Date().toISOString()
      });
    }
  }

  unsubscribe(socket, type, routeId) {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.subscriptions.delete(`${type}-${routeId}`);
      
      socket.emit('unsubscription-confirmed', {
        type: type,
        routeId: routeId,
        timestamp: new Date().toISOString()
      });
    }
  }

  async sendCurrentTrainPositions(socket, routeId) {
    try {
      const result = await db.query(`
        SELECT 
          tp.*,
          r.name as route_name
        FROM train_positions tp
        JOIN routes r ON tp.route_id = r.id
        WHERE tp.route_id = $1 
          AND tp.timestamp > NOW() - INTERVAL '5 minutes'
        ORDER BY tp.timestamp DESC
        LIMIT 10
      `, [routeId]);
      
      socket.emit('train-positions', {
        routeId: routeId,
        data: result.rows,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending train positions:', error);
    }
  }

  async sendRecentSensorData(socket, routeId) {
    try {
      const result = await db.query(`
        SELECT 
          sr.*,
          r.name as route_name
        FROM sensor_readings sr
        JOIN routes r ON sr.route_id = r.id
        WHERE sr.route_id = $1 
          AND sr.timestamp > NOW() - INTERVAL '1 hour'
        ORDER BY sr.timestamp DESC
        LIMIT 50
      `, [routeId]);
      
      socket.emit('sensor-data', {
        routeId: routeId,
        data: result.rows,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending sensor data:', error);
    }
  }

  async sendActiveAlerts(socket, routeId) {
    try {
      const result = await db.query(`
        SELECT 
          a.*,
          r.name as route_name
        FROM alerts a
        JOIN routes r ON a.route_id = r.id
        WHERE a.route_id = $1 
          AND a.status = 'active'
        ORDER BY a.severity DESC, a.created_at DESC
        LIMIT 20
      `, [routeId]);
      
      socket.emit('alerts', {
        routeId: routeId,
        data: result.rows,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending alerts:', error);
    }
  }

  async sendActiveDefects(socket, routeId) {
    try {
      const result = await db.query(`
        SELECT 
          d.*,
          r.name as route_name
        FROM defects d
        JOIN routes r ON d.route_id = r.id
        WHERE d.route_id = $1 
          AND d.status = 'active'
        ORDER BY d.severity DESC, d.detected_at DESC
        LIMIT 20
      `, [routeId]);
      
      socket.emit('defects', {
        routeId: routeId,
        data: result.rows,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending defects:', error);
    }
  }

  // Broadcast methods for real-time updates
  broadcastTrainPosition(routeId, trainData) {
    this.connectedClients.forEach((client, socketId) => {
      if (client.subscriptions.has(`train-tracking-${routeId}`)) {
        client.socket.emit('train-position-update', {
          routeId: routeId,
          data: trainData,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  broadcastSensorReading(routeId, sensorData) {
    this.connectedClients.forEach((client, socketId) => {
      if (client.subscriptions.has(`sensor-data-${routeId}`)) {
        client.socket.emit('sensor-reading-update', {
          routeId: routeId,
          data: sensorData,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  broadcastAlert(routeId, alertData) {
    this.connectedClients.forEach((client, socketId) => {
      if (client.subscriptions.has(`alerts-${routeId}`)) {
        client.socket.emit('alert-update', {
          routeId: routeId,
          data: alertData,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  broadcastDefect(routeId, defectData) {
    this.connectedClients.forEach((client, socketId) => {
      if (client.subscriptions.has(`defects-${routeId}`)) {
        client.socket.emit('defect-update', {
          routeId: routeId,
          data: defectData,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  handleDisconnect(socket) {
    this.connectedClients.delete(socket.id);
  }

  getConnectionStats() {
    return {
      totalConnections: this.connectedClients.size,
      connections: Array.from(this.connectedClients.entries()).map(([socketId, client]) => ({
        socketId: socketId,
        connectedAt: client.connectedAt,
        subscriptions: Array.from(client.subscriptions)
      }))
    };
  }
}

module.exports = new WebSocketHandler();
