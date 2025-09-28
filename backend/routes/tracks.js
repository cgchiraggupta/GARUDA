const express = require('express');
const db = require('../database/connection');

const router = express.Router();

// Get track geometry data
router.get('/tracks/geometry', async (req, res) => {
  try {
    const { route_id, start_km, end_km, limit = 1000 } = req.query;
    
    let query = `
      SELECT 
        tg.*,
        r.name as route_name,
        r.start_station,
        r.end_station
      FROM track_geometry tg
      JOIN routes r ON tg.route_id = r.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (route_id) {
      paramCount++;
      query += ` AND tg.route_id = $${paramCount}`;
      params.push(parseInt(route_id));
    }
    
    if (start_km && end_km) {
      paramCount++;
      query += ` AND tg.chainage_km BETWEEN $${paramCount}`;
      params.push(parseFloat(start_km));
      paramCount++;
      query += ` AND $${paramCount}`;
      params.push(parseFloat(end_km));
    }
    
    query += ` ORDER BY tg.route_id, tg.chainage_km LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching track geometry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch track geometry'
    });
  }
});

// Get track geometry statistics
router.get('/tracks/geometry/stats', async (req, res) => {
  try {
    const { route_id } = req.query;
    
    let query = `
      SELECT 
        r.id as route_id,
        r.name as route_name,
        COUNT(tg.id) as total_points,
        AVG(tg.gauge_mm) as avg_gauge,
        MIN(tg.gauge_mm) as min_gauge,
        MAX(tg.gauge_mm) as max_gauge,
        STDDEV(tg.gauge_mm) as gauge_stddev,
        AVG(ABS(tg.alignment_mm)) as avg_alignment_deviation,
        AVG(ABS(tg.twist_mm)) as avg_twist_deviation,
        AVG(ABS(tg.cross_level_mm)) as avg_cross_level_deviation,
        COUNT(CASE WHEN ABS(tg.gauge_mm - 1676) > 5 THEN 1 END) as gauge_violations,
        COUNT(CASE WHEN ABS(tg.alignment_mm) > 4 THEN 1 END) as alignment_violations,
        COUNT(CASE WHEN ABS(tg.twist_mm) > 3 THEN 1 END) as twist_violations
      FROM routes r
      LEFT JOIN track_geometry tg ON r.id = tg.route_id
    `;
    
    const params = [];
    
    if (route_id) {
      query += ' WHERE r.id = $1';
      params.push(parseInt(route_id));
    }
    
    query += ' GROUP BY r.id, r.name ORDER BY r.name';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching track geometry stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch track geometry statistics'
    });
  }
});

// Get track geometry violations (EN 13848 compliance)
router.get('/tracks/geometry/violations', async (req, res) => {
  try {
    const { route_id, violation_type } = req.query;
    
    let query = `
      SELECT 
        tg.*,
        r.name as route_name,
        CASE 
          WHEN ABS(tg.gauge_mm - 1676) > 5 THEN 'gauge'
          WHEN ABS(tg.alignment_mm) > 4 THEN 'alignment'
          WHEN ABS(tg.twist_mm) > 3 THEN 'twist'
          WHEN ABS(tg.cross_level_mm) > 2 THEN 'cross_level'
          ELSE 'none'
        END as violation_type,
        CASE 
          WHEN ABS(tg.gauge_mm - 1676) > 5 THEN ABS(tg.gauge_mm - 1676)
          WHEN ABS(tg.alignment_mm) > 4 THEN ABS(tg.alignment_mm)
          WHEN ABS(tg.twist_mm) > 3 THEN ABS(tg.twist_mm)
          WHEN ABS(tg.cross_level_mm) > 2 THEN ABS(tg.cross_level_mm)
          ELSE 0
        END as violation_magnitude
      FROM track_geometry tg
      JOIN routes r ON tg.route_id = r.id
      WHERE (
        ABS(tg.gauge_mm - 1676) > 5 OR
        ABS(tg.alignment_mm) > 4 OR
        ABS(tg.twist_mm) > 3 OR
        ABS(tg.cross_level_mm) > 2
      )
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (route_id) {
      paramCount++;
      query += ` AND tg.route_id = $${paramCount}`;
      params.push(parseInt(route_id));
    }
    
    if (violation_type) {
      paramCount++;
      query += ` AND (
        CASE 
          WHEN ABS(tg.gauge_mm - 1676) > 5 THEN 'gauge'
          WHEN ABS(tg.alignment_mm) > 4 THEN 'alignment'
          WHEN ABS(tg.twist_mm) > 3 THEN 'twist'
          WHEN ABS(tg.cross_level_mm) > 2 THEN 'cross_level'
          ELSE 'none'
        END
      ) = $${paramCount}`;
      params.push(violation_type);
    }
    
    query += ' ORDER BY violation_magnitude DESC, tg.chainage_km';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching track geometry violations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch track geometry violations'
    });
  }
});

// Get sensor readings
router.get('/tracks/sensor-readings', async (req, res) => {
  try {
    const { route_id, start_time, end_time, limit = 1000 } = req.query;
    
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
    
    query += ` ORDER BY sr.timestamp DESC LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching sensor readings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensor readings'
    });
  }
});

// Get sensor statistics
router.get('/tracks/sensor-readings/stats', async (req, res) => {
  try {
    const { route_id, hours = 24 } = req.query;
    
    const result = await db.query(`
      SELECT 
        r.id as route_id,
        r.name as route_name,
        COUNT(sr.id) as total_readings,
        AVG(sr.acceleration_x) as avg_acceleration_x,
        AVG(sr.acceleration_y) as avg_acceleration_y,
        AVG(sr.acceleration_z) as avg_acceleration_z,
        AVG(sr.vibration_level) as avg_vibration,
        MAX(sr.acceleration_x) as max_acceleration_x,
        MAX(sr.acceleration_y) as max_acceleration_y,
        MAX(sr.acceleration_z) as max_acceleration_z,
        MAX(sr.vibration_level) as max_vibration,
        MIN(sr.timestamp) as earliest_reading,
        MAX(sr.timestamp) as latest_reading
      FROM routes r
      LEFT JOIN sensor_readings sr ON r.id = sr.route_id 
        AND sr.timestamp > NOW() - INTERVAL '${parseInt(hours)} hours'
    ` + (route_id ? ' WHERE r.id = $1' : '') + `
      GROUP BY r.id, r.name
      ORDER BY r.name
    `, route_id ? [parseInt(route_id)] : []);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching sensor statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensor statistics'
    });
  }
});

module.exports = router;