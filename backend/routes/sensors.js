const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// Get sensor readings
router.get('/readings', async (req, res) => {
  try {
    const { 
      route_id, 
      sensor_type, 
      start_time, 
      end_time,
      limit = 1000,
      offset = 0 
    } = req.query;
    
    let query = `
      SELECT 
        sr.*,
        r.name as route_name
      FROM sensor_readings sr
      JOIN routes r ON sr.route_id = r.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (route_id) {
      paramCount++;
      query += ` AND sr.route_id = $${paramCount}`;
      params.push(parseInt(route_id));
    }
    
    if (sensor_type) {
      paramCount++;
      query += ` AND sr.sensor_type = $${paramCount}`;
      params.push(sensor_type);
    }
    
    if (start_time) {
      paramCount++;
      query += ` AND sr.timestamp >= $${paramCount}`;
      params.push(new Date(start_time));
    }
    
    if (end_time) {
      paramCount++;
      query += ` AND sr.timestamp <= $${paramCount}`;
      params.push(new Date(end_time));
    }
    
    query += ` ORDER BY sr.timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching sensor readings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensor readings',
      message: error.message
    });
  }
});

// Get sensor readings for specific route
router.get('/readings/:routeId', async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const { 
      sensor_type, 
      time_period = '1 hour',
      limit = 500 
    } = req.query;
    
    let query = `
      SELECT 
        sr.*,
        r.name as route_name
      FROM sensor_readings sr
      JOIN routes r ON sr.route_id = r.id
      WHERE sr.route_id = $1 
        AND sr.timestamp > NOW() - INTERVAL '${time_period}'
    `;
    
    const params = [routeId];
    
    if (sensor_type) {
      query += ` AND sr.sensor_type = $2`;
      params.push(sensor_type);
    }
    
    query += ` ORDER BY sr.timestamp DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
      route_id: routeId,
      time_period: time_period
    });
  } catch (error) {
    console.error('Error fetching sensor readings for route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensor readings',
      message: error.message
    });
  }
});

// Submit sensor reading
router.post('/readings', async (req, res) => {
  try {
    const {
      route_id,
      chainage_km,
      sensor_type,
      reading_value,
      unit,
      quality_score = 100
    } = req.body;
    
    // Validate required fields
    if (!route_id || !chainage_km || !sensor_type || reading_value === undefined || !unit) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: route_id, chainage_km, sensor_type, reading_value, unit'
      });
    }
    
    const result = await db.query(`
      INSERT INTO sensor_readings 
      (route_id, chainage_km, sensor_type, reading_value, unit, quality_score)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      route_id, chainage_km, sensor_type, reading_value, unit, quality_score
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Sensor reading submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting sensor reading:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit sensor reading',
      message: error.message
    });
  }
});

// Get sensor statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { route_id, time_period = '24 hours' } = req.query;
    
    let query = `
      SELECT 
        sensor_type,
        COUNT(*) as reading_count,
        AVG(reading_value) as avg_value,
        MIN(reading_value) as min_value,
        MAX(reading_value) as max_value,
        STDDEV(reading_value) as stddev_value,
        AVG(quality_score) as avg_quality,
        MIN(quality_score) as min_quality,
        MAX(quality_score) as max_quality,
        unit
      FROM sensor_readings sr
      WHERE sr.timestamp > NOW() - INTERVAL '${time_period}'
    `;
    
    const params = [];
    
    if (route_id) {
      query += ` AND sr.route_id = $1`;
      params.push(parseInt(route_id));
    }
    
    query += ` GROUP BY sensor_type, unit ORDER BY sensor_type`;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      route_id: route_id || 'all',
      time_period: time_period
    });
  } catch (error) {
    console.error('Error fetching sensor statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensor statistics',
      message: error.message
    });
  }
});

// Get sensor data trends
router.get('/trends/:routeId', async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const { 
      sensor_type, 
      time_period = '7 days',
      interval = '1 hour' 
    } = req.query;
    
    let query = `
      SELECT 
        DATE_TRUNC('${interval}', timestamp) as time_bucket,
        AVG(reading_value) as avg_value,
        MIN(reading_value) as min_value,
        MAX(reading_value) as max_value,
        COUNT(*) as reading_count
      FROM sensor_readings sr
      WHERE sr.route_id = $1 
        AND sr.timestamp > NOW() - INTERVAL '${time_period}'
    `;
    
    const params = [routeId];
    
    if (sensor_type) {
      query += ` AND sr.sensor_type = $2`;
      params.push(sensor_type);
    }
    
    query += ` GROUP BY time_bucket ORDER BY time_bucket`;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      route_id: routeId,
      sensor_type: sensor_type || 'all',
      time_period: time_period,
      interval: interval
    });
  } catch (error) {
    console.error('Error fetching sensor trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensor trends',
      message: error.message
    });
  }
});

// Get sensor health status
router.get('/health/:routeId', async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const { time_period = '1 hour' } = req.query;
    
    const result = await db.query(`
      SELECT 
        sensor_type,
        COUNT(*) as total_readings,
        COUNT(CASE WHEN quality_score >= 90 THEN 1 END) as good_readings,
        COUNT(CASE WHEN quality_score < 90 AND quality_score >= 70 THEN 1 END) as fair_readings,
        COUNT(CASE WHEN quality_score < 70 THEN 1 END) as poor_readings,
        AVG(quality_score) as avg_quality,
        MAX(timestamp) as last_reading_time,
        CASE 
          WHEN MAX(timestamp) < NOW() - INTERVAL '10 minutes' THEN 'Offline'
          WHEN AVG(quality_score) >= 90 THEN 'Healthy'
          WHEN AVG(quality_score) >= 70 THEN 'Degraded'
          ELSE 'Unhealthy'
        END as health_status
      FROM sensor_readings sr
      WHERE sr.route_id = $1 
        AND sr.timestamp > NOW() - INTERVAL '${time_period}'
      GROUP BY sensor_type
      ORDER BY sensor_type
    `, [routeId]);
    
    res.json({
      success: true,
      data: result.rows,
      route_id: routeId,
      time_period: time_period,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sensor health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensor health',
      message: error.message
    });
  }
});

// Get real-time sensor data
router.get('/realtime/:routeId', async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const { limit = 100 } = req.query;
    
    const result = await db.query(`
      SELECT 
        sr.*,
        r.name as route_name
      FROM sensor_readings sr
      JOIN routes r ON sr.route_id = r.id
      WHERE sr.route_id = $1 
        AND sr.timestamp > NOW() - INTERVAL '5 minutes'
      ORDER BY sr.timestamp DESC
      LIMIT $2
    `, [routeId, parseInt(limit)]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
      route_id: routeId,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching real-time sensor data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time sensor data',
      message: error.message
    });
  }
});

module.exports = router;
