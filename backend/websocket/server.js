const { v4: uuidv4 } = require('uuid');

class WebSocketManager {
  constructor() {
    this.clients = new Map();
    this.rooms = new Map();
  }

  setupWebSocket(wss) {
    wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      const clientInfo = {
        id: clientId,
        ws: ws,
        rooms: new Set(),
        lastPing: Date.now(),
        ip: req.socket.remoteAddress
      };

      this.clients.set(clientId, clientInfo);
      console.log(`🔌 WebSocket client connected: ${clientId} from ${clientInfo.ip}`);

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
          this.handleMessage(clientId, message);
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
        this.removeClient(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.removeClient(clientId);
      });

      // Ping/pong for connection health
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
        }
      });
    });

    // Start ping interval
    setInterval(() => {
      this.pingClients();
    }, 30000); // Ping every 30 seconds

    // Start cleanup interval
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000); // Cleanup every minute
  }

  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'join_room':
        this.joinRoom(clientId, message.room);
        break;
      case 'leave_room':
        this.leaveRoom(clientId, message.room);
        break;
      case 'subscribe':
        this.subscribe(clientId, message.topic);
        break;
      case 'unsubscribe':
        this.unsubscribe(clientId, message.topic);
        break;
      case 'ping':
        client.ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;
      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  joinRoom(clientId, roomName) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.rooms.add(roomName);
    
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    this.rooms.get(roomName).add(clientId);

    console.log(`Client ${clientId} joined room: ${roomName}`);
    
    client.ws.send(JSON.stringify({
      type: 'room_joined',
      room: roomName,
      timestamp: new Date().toISOString()
    }));
  }

  leaveRoom(clientId, roomName) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.rooms.delete(roomName);
    
    const room = this.rooms.get(roomName);
    if (room) {
      room.delete(clientId);
      if (room.size === 0) {
        this.rooms.delete(roomName);
      }
    }

    console.log(`Client ${clientId} left room: ${roomName}`);
    
    client.ws.send(JSON.stringify({
      type: 'room_left',
      room: roomName,
      timestamp: new Date().toISOString()
    }));
  }

  subscribe(clientId, topic) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Add topic to client's subscriptions
    if (!client.subscriptions) {
      client.subscriptions = new Set();
    }
    client.subscriptions.add(topic);

    console.log(`Client ${clientId} subscribed to topic: ${topic}`);
    
    client.ws.send(JSON.stringify({
      type: 'subscribed',
      topic: topic,
      timestamp: new Date().toISOString()
    }));
  }

  unsubscribe(clientId, topic) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (client.subscriptions) {
      client.subscriptions.delete(topic);
    }

    console.log(`Client ${clientId} unsubscribed from topic: ${topic}`);
    
    client.ws.send(JSON.stringify({
      type: 'unsubscribed',
      topic: topic,
      timestamp: new Date().toISOString()
    }));
  }

  broadcastToRoom(roomName, data) {
    const room = this.rooms.get(roomName);
    if (!room) return;

    const message = JSON.stringify({
      type: 'broadcast',
      room: roomName,
      data: data,
      timestamp: new Date().toISOString()
    });

    room.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === 1) { // WebSocket.OPEN
        client.ws.send(message);
      }
    });
  }

  broadcastToTopic(topic, data) {
    const message = JSON.stringify({
      type: 'topic_update',
      topic: topic,
      data: data,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach(client => {
      if (client.subscriptions && client.subscriptions.has(topic) && client.ws.readyState === 1) {
        client.ws.send(message);
      }
    });
  }

  broadcastToAll(data) {
    const message = JSON.stringify({
      type: 'system_broadcast',
      data: data,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach(client => {
      if (client.ws.readyState === 1) {
        client.ws.send(message);
      }
    });
  }

  removeClient(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all rooms
    client.rooms.forEach(roomName => {
      const room = this.rooms.get(roomName);
      if (room) {
        room.delete(clientId);
        if (room.size === 0) {
          this.rooms.delete(roomName);
        }
      }
    });

    this.clients.delete(clientId);
  }

  pingClients() {
    this.clients.forEach(client => {
      if (client.ws.readyState === 1) {
        client.ws.ping();
      }
    });
  }

  cleanupStaleConnections() {
    const now = Date.now();
    const staleTimeout = 60000; // 1 minute

    this.clients.forEach((client, clientId) => {
      if (now - client.lastPing > staleTimeout) {
        console.log(`Removing stale connection: ${clientId}`);
        client.ws.terminate();
        this.removeClient(clientId);
      }
    });
  }

  getStats() {
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      rooms: Array.from(this.rooms.keys()),
      clients: Array.from(this.clients.keys())
    };
  }
}

// Create singleton instance
const wsManager = new WebSocketManager();

module.exports = {
  setupWebSocket: (wss) => wsManager.setupWebSocket(wss),
  broadcastToRoom: (room, data) => wsManager.broadcastToRoom(room, data),
  broadcastToTopic: (topic, data) => wsManager.broadcastToTopic(topic, data),
  broadcastToAll: (data) => wsManager.broadcastToAll(data),
  getStats: () => wsManager.getStats()
};
