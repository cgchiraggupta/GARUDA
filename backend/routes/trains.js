const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// Get current train positions
router.get('/positions', async (req, res) => {
  try {
    const { route_id, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        tp.*,
        r.name as route_name,
        r.start_station,
        r.end_station
      FROM train_positions tp
      JOIN routes r ON tp.route_id = r.id
      WHERE tp.timestamp > NOW() - INTERVAL '10 minutes'
    `;
    
    const params = [];
    
    if (route_id) {
      query += ` AND tp.route_id = $1`;
      params.push(parseInt(route_id));
    }
    
    query += ` ORDER BY tp.timestamp DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching train positions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch train positions',
      message: error.message
    });
  }
});

// Get train positions for specific route
router.get('/positions/:routeId', async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const { limit = 20 } = req.query;
    
    const result = await db.query(`
      SELECT 
        tp.*,
        r.name as route_name,
        r.start_station,
        r.end_station
      FROM train_positions tp
      JOIN routes r ON tp.route_id = r.id
      WHERE tp.route_id = $1 
        AND tp.timestamp > NOW() - INTERVAL '10 minutes'
      ORDER BY tp.timestamp DESC
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
    console.error('Error fetching train positions for route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch train positions',
      message: error.message
    });
  }
});

// Update train position (for simulation)
router.post('/positions', async (req, res) => {
  try {
    const {
      route_id,
      train_number,
      latitude,
      longitude,
      chainage_km,
      speed_kmh,
      direction = 'forward',
      acceleration_x = 0,
      acceleration_y = 0,
      acceleration_z = 0,
      vibration_level = 0
    } = req.body;
    
    // Validate required fields
    if (!route_id || !latitude || !longitude || chainage_km === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: route_id, latitude, longitude, chainage_km'
      });
    }
    
    const result = await db.query(`
      INSERT INTO train_positions 
      (route_id, train_number, latitude, longitude, chainage_km, speed_kmh, direction, 
       acceleration_x, acceleration_y, acceleration_z, vibration_level)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      route_id, train_number, latitude, longitude, chainage_km, speed_kmh, direction,
      acceleration_x, acceleration_y, acceleration_z, vibration_level
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Train position updated successfully'
    });
  } catch (error) {
    console.error('Error updating train position:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update train position',
      message: error.message
    });
  }
});

// Get train movement history
router.get('/history/:routeId', async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const { 
      start_time, 
      end_time, 
      train_number,
      limit = 1000 
    } = req.query;
    
    let query = `
      SELECT 
        tp.*,
        r.name as route_name
      FROM train_positions tp
      JOIN routes r ON tp.route_id = r.id
      WHERE tp.route_id = $1
    `;
    
    const params = [routeId];
    let paramCount = 1;
    
    if (start_time) {
      paramCount++;
      query += ` AND tp.timestamp >= $${paramCount}`;
      params.push(new Date(start_time));
    }
    
    if (end_time) {
      paramCount++;
      query += ` AND tp.timestamp <= $${paramCount}`;
      params.push(new Date(end_time));
    }
    
    if (train_number) {
      paramCount++;
      query += ` AND tp.train_number = $${paramCount}`;
      params.push(train_number);
    }
    
    query += ` ORDER BY tp.timestamp DESC LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
      route_id: routeId
    });
  } catch (error) {
    console.error('Error fetching train history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch train history',
      message: error.message
    });
  }
});

// Get train statistics
router.get('/stats/:routeId', async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const { time_period = '24 hours' } = req.query;
    
    const result = await db.query(`
      SELECT 
        COUNT(DISTINCT train_number) as unique_trains,
        COUNT(*) as total_positions,
        AVG(speed_kmh) as avg_speed,
        MAX(speed_kmh) as max_speed,
        MIN(speed_kmh) as min_speed,
        AVG(acceleration_x) as avg_acceleration_x,
        AVG(acceleration_y) as avg_acceleration_y,
        AVG(acceleration_z) as avg_acceleration_z,
        AVG(vibration_level) as avg_vibration,
        MAX(vibration_level) as max_vibration,
        COUNT(CASE WHEN speed_kmh > 100 THEN 1 END) as high_speed_count,
        COUNT(CASE WHEN ABS(acceleration_x) > 0.5 OR ABS(acceleration_y) > 0.5 THEN 1 END) as high_acceleration_count
      FROM train_positions tp
      WHERE tp.route_id = $1 
        AND tp.timestamp > NOW() - INTERVAL '${time_period}'
    `, [routeId]);
    
    res.json({
      success: true,
      data: result.rows[0],
      route_id: routeId,
      time_period: time_period
    });
  } catch (error) {
    console.error('Error fetching train statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch train statistics',
      message: error.message
    });
  }
});

// Get active trains summary
router.get('/active/summary', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        r.id as route_id,
        r.name as route_name,
        COUNT(DISTINCT tp.train_number) as active_trains,
        AVG(tp.speed_kmh) as avg_speed,
        MAX(tp.speed_kmh) as max_speed,
        COUNT(CASE WHEN tp.speed_kmh = 0 THEN 1 END) as stationary_trains,
        COUNT(CASE WHEN tp.speed_kmh > 100 THEN 1 END) as high_speed_trains
      FROM routes r
      LEFT JOIN train_positions tp ON r.id = tp.route_id 
        AND tp.timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);
    
    const totalActiveTrains = result.rows.reduce((sum, row) => sum + parseInt(row.active_trains), 0);
    
    res.json({
      success: true,
      data: {
        routes: result.rows,
        total_active_trains: totalActiveTrains,
        last_updated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching active trains summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active trains summary',
      message: error.message
    });
  }
});

module.exports = router;
