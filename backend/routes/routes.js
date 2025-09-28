const express = require('express');
const db = require('../database/connection');

const router = express.Router();

// Get all routes
router.get('/routes', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        r.*,
        COUNT(tg.id) as geometry_points,
        COUNT(d.id) as active_defects,
        COUNT(mr.id) as scheduled_maintenance
      FROM routes r
      LEFT JOIN track_geometry tg ON r.id = tg.route_id
      LEFT JOIN defects d ON r.id = d.route_id AND d.status = 'active'
      LEFT JOIN maintenance_records mr ON r.id = mr.route_id AND mr.status = 'scheduled'
      GROUP BY r.id
      ORDER BY r.name
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routes'
    });
  }
});

// Get specific route details
router.get('/routes/:id', async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    
    const routeResult = await db.query('SELECT * FROM routes WHERE id = $1', [routeId]);
    if (routeResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    }
    
    const route = routeResult.rows[0];
    
    // Get route statistics
    const statsResult = await db.query(`
      SELECT 
        COUNT(tg.id) as total_geometry_points,
        COUNT(d.id) as total_defects,
        COUNT(CASE WHEN d.severity = 'critical' THEN 1 END) as critical_defects,
        COUNT(CASE WHEN d.severity = 'high' THEN 1 END) as high_defects,
        COUNT(mr.id) as scheduled_maintenance,
        AVG(tg.gauge_mm) as avg_gauge,
        MIN(tg.gauge_mm) as min_gauge,
        MAX(tg.gauge_mm) as max_gauge
      FROM routes r
      LEFT JOIN track_geometry tg ON r.id = tg.route_id
      LEFT JOIN defects d ON r.id = d.route_id AND d.status = 'active'
      LEFT JOIN maintenance_records mr ON r.id = mr.route_id AND mr.status = 'scheduled'
      WHERE r.id = $1
      GROUP BY r.id
    `, [routeId]);
    
    const stats = statsResult.rows[0] || {};
    
    res.json({
      success: true,
      data: {
        ...route,
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Error fetching route details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch route details'
    });
  }
});

// Get live train data for a route
router.get('/routes/:id/live', async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    
    // Get current train positions
    const trainsResult = await db.query(`
      SELECT 
        tp.*,
        r.name as route_name,
        r.start_station,
        r.end_station
      FROM train_positions tp
      JOIN routes r ON tp.route_id = r.id
      WHERE tp.route_id = $1 
        AND tp.timestamp > NOW() - INTERVAL '5 minutes'
      ORDER BY tp.timestamp DESC
    `, [routeId]);
    
    // Get recent sensor readings
    const sensorResult = await db.query(`
      SELECT 
        sr.*,
        r.name as route_name
      FROM sensor_readings sr
      JOIN routes r ON sr.route_id = r.id
      WHERE sr.route_id = $1 
        AND sr.timestamp > NOW() - INTERVAL '10 minutes'
      ORDER BY sr.timestamp DESC
      LIMIT 100
    `, [routeId]);
    
    // Get active alerts
    const alertsResult = await db.query(`
      SELECT 
        a.*,
        r.name as route_name
      FROM alerts a
      JOIN routes r ON a.route_id = r.id
      WHERE a.route_id = $1 
        AND a.status = 'active'
      ORDER BY a.created_at DESC
    `, [routeId]);
    
    res.json({
      success: true,
      data: {
        trains: trainsResult.rows,
        sensor_readings: sensorResult.rows,
        alerts: alertsResult.rows,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching live data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live data'
    });
  }
});

// Get route geometry data
router.get('/routes/:id/geometry', async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    const { start_km, end_km, limit = 1000 } = req.query;
    
    let query = `
      SELECT 
        chainage_km,
        latitude,
        longitude,
        gauge_mm,
        alignment_mm,
        twist_mm,
        cross_level_mm,
        vertical_profile_mm,
        horizontal_curvature_radius_m,
        vertical_curvature_radius_m
      FROM track_geometry 
      WHERE route_id = $1
    `;
    
    const params = [routeId];
    
    if (start_km && end_km) {
      query += ' AND chainage_km BETWEEN $2 AND $3';
      params.push(parseFloat(start_km), parseFloat(end_km));
    }
    
    query += ' ORDER BY chainage_km LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching geometry data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch geometry data'
    });
  }
});

// Get route defects
router.get('/routes/:id/defects', async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    const { severity, status = 'active' } = req.query;
    
    let query = `
      SELECT 
        d.*,
        r.name as route_name
      FROM defects d
      JOIN routes r ON d.route_id = r.id
      WHERE d.route_id = $1 AND d.status = $2
    `;
    
    const params = [routeId, status];
    
    if (severity) {
      query += ' AND d.severity = $3';
      params.push(severity);
    }
    
    query += ' ORDER BY d.severity DESC, d.detected_at DESC';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching route defects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch route defects'
    });
  }
});

module.exports = router;