const db = require('../database/connection');
const { broadcastToTopic, broadcastToRoom } = require('../websocket/server');

class SimulationEngine {
  constructor() {
    this.isRunning = false;
    this.simulationSpeed = 1.0;
    this.updateInterval = 2000; // 2 seconds
    this.trains = new Map();
    this.intervals = new Map();
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Simulation engine is already running');
      return;
    }

    console.log('🚂 Starting ITMS simulation engine...');
    this.isRunning = true;

    // Initialize trains for each route
    await this.initializeTrains();

    // Start simulation loops
    this.startTrainMovement();
    this.startSensorDataGeneration();
    this.startDefectDetection();
    this.startAlertGeneration();

    console.log('✅ Simulation engine started successfully');
  }

  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Simulation engine is not running');
      return;
    }

    console.log('🛑 Stopping simulation engine...');
    this.isRunning = false;

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();

    console.log('✅ Simulation engine stopped');
  }

  async initializeTrains() {
    try {
      // Get all routes
      const routesResult = await db.query('SELECT * FROM routes ORDER BY id');
      
      routesResult.rows.forEach(route => {
        // Create 2-3 trains per route
        const trainCount = Math.floor(Math.random() * 2) + 2;
        
        for (let i = 0; i < trainCount; i++) {
          const trainId = `TRAIN_${route.id}_${i + 1}`;
          const train = {
            id: trainId,
            routeId: route.id,
            routeName: route.name,
            currentChainage: Math.random() * route.distance_km,
            speed: 60 + Math.random() * 100, // 60-160 km/h
            direction: Math.random() > 0.5 ? 'forward' : 'backward',
            lastUpdate: new Date(),
            status: 'running'
          };
          
          this.trains.set(trainId, train);
        }
      });

      console.log(`🚂 Initialized ${this.trains.size} trains across ${routesResult.rowCount} routes`);
    } catch (error) {
      console.error('❌ Error initializing trains:', error);
    }
  }

  startTrainMovement() {
    const interval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        for (const [trainId, train] of this.trains) {
          // Update train position
          const speedKmPerSecond = train.speed / 3600; // Convert km/h to km/s
          const distanceMoved = speedKmPerSecond * (this.updateInterval / 1000) * this.simulationSpeed;
          
          if (train.direction === 'forward') {
            train.currentChainage += distanceMoved;
          } else {
            train.currentChainage -= distanceMoved;
          }

          // Get route distance
          const routeResult = await db.query('SELECT distance_km FROM routes WHERE id = $1', [train.routeId]);
          const routeDistance = routeResult.rows[0].distance_km;

          // Reverse direction at route ends
          if (train.currentChainage >= routeDistance) {
            train.currentChainage = routeDistance;
            train.direction = 'backward';
          } else if (train.currentChainage <= 0) {
            train.currentChainage = 0;
            train.direction = 'forward';
          }

          // Get GPS coordinates for current position
          const geoResult = await db.query(
            'SELECT latitude, longitude FROM track_geometry WHERE route_id = $1 ORDER BY ABS(chainage_km - $2) LIMIT 1',
            [train.routeId, train.currentChainage]
          );

          if (geoResult.rows.length > 0) {
            const { latitude, longitude } = geoResult.rows[0];
            
            // Update train position in database
            await db.query(
              `INSERT INTO train_positions (route_id, train_id, latitude, longitude, chainage_km, speed_kmh, direction) 
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [train.routeId, trainId, latitude, longitude, train.currentChainage, train.speed, train.direction]
            );

            // Broadcast train position update
            broadcastToTopic('train-tracking', {
              trainId: trainId,
              routeId: train.routeId,
              routeName: train.routeName,
              latitude: latitude,
              longitude: longitude,
              chainage: train.currentChainage,
              speed: train.speed,
              direction: train.direction,
              timestamp: new Date().toISOString()
            });

            // Broadcast to route-specific room
            broadcastToRoom(`route_${train.routeId}`, {
              type: 'train_update',
              train: {
                id: trainId,
                latitude: latitude,
                longitude: longitude,
                chainage: train.currentChainage,
                speed: train.speed,
                direction: train.direction
              }
            });
          }

          train.lastUpdate = new Date();
        }
      } catch (error) {
        console.error('❌ Error in train movement simulation:', error);
      }
    }, this.updateInterval);

    this.intervals.set('trainMovement', interval);
  }

  startSensorDataGeneration() {
    const interval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        // Generate sensor readings for each route
        const routesResult = await db.query('SELECT * FROM routes');
        
        for (const route of routesResult.rows) {
          // Generate 5-10 sensor readings per route per update
          const readingCount = Math.floor(Math.random() * 6) + 5;
          
          for (let i = 0; i < readingCount; i++) {
            const chainage = Math.random() * route.distance_km;
            
            // Generate realistic sensor data
            const sensorData = {
              route_id: route.id,
              chainage_km: chainage,
              acceleration_x: (Math.random() - 0.5) * 2, // ±1g
              acceleration_y: (Math.random() - 0.5) * 2,
              acceleration_z: (Math.random() - 0.5) * 2,
              vibration_level: Math.random() * 3, // 0-3
              temperature_celsius: 20 + Math.random() * 30, // 20-50°C
              humidity_percent: 40 + Math.random() * 40 // 40-80%
            };

            // Insert sensor reading
            await db.query(
              `INSERT INTO sensor_readings (route_id, chainage_km, acceleration_x, acceleration_y, acceleration_z, vibration_level, temperature_celsius, humidity_percent) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [sensorData.route_id, sensorData.chainage_km, sensorData.acceleration_x, sensorData.acceleration_y, sensorData.acceleration_z, sensorData.vibration_level, sensorData.temperature_celsius, sensorData.humidity_percent]
            );

            // Broadcast sensor data
            broadcastToTopic('sensor-data', {
              routeId: route.id,
              routeName: route.name,
              ...sensorData,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('❌ Error in sensor data generation:', error);
      }
    }, this.updateInterval);

    this.intervals.set('sensorData', interval);
  }

  startDefectDetection() {
    const interval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        // Simulate defect detection (2% chance per route per update)
        const routesResult = await db.query('SELECT * FROM routes');
        
        for (const route of routesResult.rows) {
          if (Math.random() < 0.02) { // 2% chance
            const chainage = Math.random() * route.distance_km;
            const defectTypes = ['crack', 'wear', 'misalignment', 'loose_fastening', 'ballast_degradation'];
    const severities = ['low', 'medium', 'high', 'critical'];
    const severityWeights = [0.4, 0.3, 0.2, 0.1];

    const defectType = defectTypes[Math.floor(Math.random() * defectTypes.length)];
            const severity = this.getWeightedRandom(severities, severityWeights);
            
            // Get GPS coordinates
            const geoResult = await db.query(
              'SELECT latitude, longitude FROM track_geometry WHERE route_id = $1 ORDER BY ABS(chainage_km - $2) LIMIT 1',
              [route.id, chainage]
            );

            if (geoResult.rows.length > 0) {
              const { latitude, longitude } = geoResult.rows[0];
              
              // Create defect
              const defectResult = await db.query(
                `INSERT INTO defects (route_id, chainage_km, defect_type, severity, description, confidence_score, repair_priority, estimated_repair_cost) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [route.id, chainage, defectType, severity, `${defectType.replace('_', ' ')} detected at chainage ${chainage.toFixed(3)} km`, 0.7 + Math.random() * 0.3, severities.indexOf(severity) + 1, this.getRepairCost(defectType, severity)]
              );

              const defect = defectResult.rows[0];

              // Create alert
              await db.query(
                `INSERT INTO alerts (route_id, alert_type, severity, message, chainage_km, latitude, longitude) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [route.id, 'defect_detected', severity, `New ${severity} severity ${defectType} detected at chainage ${chainage.toFixed(3)} km`, chainage, latitude, longitude]
              );

              // Broadcast defect detection
              broadcastToTopic('defect-detection', {
                routeId: route.id,
                routeName: route.name,
                defect: defect,
                latitude: latitude,
                longitude: longitude,
                timestamp: new Date().toISOString()
              });

              // Broadcast alert
              broadcastToTopic('alerts', {
                type: 'defect_detected',
                severity: severity,
                message: `New ${severity} severity ${defectType} detected at chainage ${chainage.toFixed(3)} km`,
                routeId: route.id,
                routeName: route.name,
                chainage: chainage,
                latitude: latitude,
                longitude: longitude,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
    } catch (error) {
        console.error('❌ Error in defect detection simulation:', error);
      }
    }, this.updateInterval * 5); // Run every 10 seconds

    this.intervals.set('defectDetection', interval);
  }

  startAlertGeneration() {
    const interval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        // Generate various types of alerts
        const alertTypes = [
          { type: 'speed_restriction', message: 'Speed restriction due to track maintenance', severity: 'warning' },
          { type: 'weather_alert', message: 'Heavy rain affecting track conditions', severity: 'info' },
          { type: 'maintenance_due', message: 'Scheduled maintenance due in 7 days', severity: 'info' },
          { type: 'system_status', message: 'All systems operating normally', severity: 'info' }
        ];

        // 5% chance of generating an alert per update
        if (Math.random() < 0.05) {
          const routesResult = await db.query('SELECT * FROM routes');
          const route = routesResult.rows[Math.floor(Math.random() * routesResult.rows.length)];
          const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
          const chainage = Math.random() * route.distance_km;

          // Get GPS coordinates
          const geoResult = await db.query(
            'SELECT latitude, longitude FROM track_geometry WHERE route_id = $1 ORDER BY ABS(chainage_km - $2) LIMIT 1',
            [route.id, chainage]
          );

          if (geoResult.rows.length > 0) {
            const { latitude, longitude } = geoResult.rows[0];
            
            // Create alert
            await db.query(
              `INSERT INTO alerts (route_id, alert_type, severity, message, chainage_km, latitude, longitude) 
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [route.id, alertType.type, alertType.severity, alertType.message, chainage, latitude, longitude]
            );

            // Broadcast alert
            broadcastToTopic('alerts', {
              type: alertType.type,
              severity: alertType.severity,
              message: alertType.message,
              routeId: route.id,
              routeName: route.name,
              chainage: chainage,
              latitude: latitude,
              longitude: longitude,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('❌ Error in alert generation:', error);
      }
    }, this.updateInterval * 3); // Run every 6 seconds

    this.intervals.set('alertGeneration', interval);
  }

  getWeightedRandom(items, weights) {
    const random = Math.random();
    let weightSum = 0;
    
    for (let i = 0; i < items.length; i++) {
      weightSum += weights[i];
      if (random <= weightSum) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }

  getRepairCost(defectType, severity) {
    const baseCosts = {
      'crack': 50000,
      'wear': 30000,
      'misalignment': 75000,
      'loose_fastening': 15000,
      'ballast_degradation': 100000
    };
    
    const severityMultipliers = {
      'low': 1,
      'medium': 2,
      'high': 4,
      'critical': 8
    };
    
    return baseCosts[defectType] * severityMultipliers[severity];
  }

  setSimulationSpeed(speed) {
    this.simulationSpeed = Math.max(0.1, Math.min(10.0, speed));
    console.log(`🚂 Simulation speed set to ${this.simulationSpeed}x`);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      simulationSpeed: this.simulationSpeed,
      updateInterval: this.updateInterval,
      activeTrains: this.trains.size,
      activeIntervals: this.intervals.size
    };
  }
}

// Create singleton instance
const simulationEngine = new SimulationEngine();

// Start simulation when module is loaded
function startSimulation() {
  simulationEngine.start();
}

module.exports = {
  startSimulation,
  simulationEngine
};