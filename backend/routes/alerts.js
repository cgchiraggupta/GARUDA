const express = require('express');
const db = require('../database/connection');

const router = express.Router();

// Get all alerts
router.get('/alerts', async (req, res) => {
  try {
    const { route_id, severity, status = 'active', limit = 100 } = req.query;
    
    let query = `
      SELECT 
        a.*,
        r.name as route_name,
        r.start_station,
        r.end_station
      FROM alerts a
      JOIN routes r ON a.route_id = r.id
      WHERE a.status = $1
    `;
    
    const params = [status];
    let paramCount = 1;
    
    if (route_id) {
      paramCount++;
      query += ` AND a.route_id = $${paramCount}`;
      params.push(parseInt(route_id));
    }
    
    if (severity) {
      paramCount++;
      query += ` AND a.severity = $${paramCount}`;
      params.push(severity);
    }
    
    query += ` ORDER BY a.severity DESC, a.created_at DESC LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

// Create new alert
router.post('/alerts', async (req, res) => {
  try {
    const {
      route_id,
      alert_type,
      severity,
      message,
      chainage_km,
      latitude,
      longitude
    } = req.body;
    
    // Validate required fields
    if (!route_id || !alert_type || !severity || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: route_id, alert_type, severity, message'
      });
    }
    
    // Validate severity
    if (!['info', 'warning', 'error', 'critical'].includes(severity)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid severity. Must be one of: info, warning, error, critical'
      });
    }
    
    const result = await db.query(
      `INSERT INTO alerts (route_id, alert_type, severity, message, chainage_km, latitude, longitude) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [route_id, alert_type, severity, message, chainage_km, latitude, longitude]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert'
    });
  }
});

// Update alert status
router.put('/alerts/:id/status', async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!['active', 'acknowledged', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: active, acknowledged, resolved'
      });
    }
    
    let updateQuery = 'UPDATE alerts SET status = $1';
    const params = [status];
    let paramCount = 1;
    
    if (status === 'acknowledged') {
      paramCount++;
      updateQuery += `, acknowledged_at = $${paramCount}`;
      params.push(new Date());
    } else if (status === 'resolved') {
      paramCount++;
      updateQuery += `, resolved_at = $${paramCount}`;
      params.push(new Date());
    }
    
    paramCount++;
    updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
    params.push(alertId);
    
    const result = await db.query(updateQuery, params);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating alert status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert status'
    });
  }
});

// Get alert statistics
router.get('/alerts/stats', async (req, res) => {
  try {
    const { route_id, days = 7 } = req.query;
    
    const result = await db.query(`
      SELECT 
        r.id as route_id,
        r.name as route_name,
        COUNT(a.id) as total_alerts,
        COUNT(CASE WHEN a.severity = 'critical' THEN 1 END) as critical_alerts,
        COUNT(CASE WHEN a.severity = 'error' THEN 1 END) as error_alerts,
        COUNT(CASE WHEN a.severity = 'warning' THEN 1 END) as warning_alerts,
        COUNT(CASE WHEN a.severity = 'info' THEN 1 END) as info_alerts,
        COUNT(CASE WHEN a.status = 'active' THEN 1 END) as active_alerts,
        COUNT(CASE WHEN a.status = 'acknowledged' THEN 1 END) as acknowledged_alerts,
        COUNT(CASE WHEN a.status = 'resolved' THEN 1 END) as resolved_alerts,
        COUNT(CASE WHEN a.created_at > NOW() - INTERVAL '${parseInt(days)} days' THEN 1 END) as recent_alerts
      FROM routes r
      LEFT JOIN alerts a ON r.id = a.route_id
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
    console.error('Error fetching alert statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert statistics'
    });
  }
});

// Get alerts by type
router.get('/alerts/by-type', async (req, res) => {
  try {
    const { route_id, days = 30 } = req.query;
    
    const result = await db.query(`
      SELECT 
        a.alert_type,
        COUNT(*) as count,
        COUNT(CASE WHEN a.severity = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN a.severity = 'error' THEN 1 END) as error_count,
        COUNT(CASE WHEN a.severity = 'warning' THEN 1 END) as warning_count,
        COUNT(CASE WHEN a.severity = 'info' THEN 1 END) as info_count,
        COUNT(CASE WHEN a.status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN a.status = 'resolved' THEN 1 END) as resolved_count
      FROM alerts a
      JOIN routes r ON a.route_id = r.id
      WHERE a.created_at > NOW() - INTERVAL '${parseInt(days)} days'
    ` + (route_id ? ' AND a.route_id = $1' : '') + `
      GROUP BY a.alert_type
      ORDER BY count DESC
    `, route_id ? [parseInt(route_id)] : []);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching alerts by type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts by type'
    });
  }
});

// Get alert details
router.get('/alerts/:id', async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    
    const result = await db.query(`
      SELECT 
        a.*,
        r.name as route_name,
        r.start_station,
        r.end_station
      FROM alerts a
      JOIN routes r ON a.route_id = r.id
      WHERE a.id = $1
    `, [alertId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching alert details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert details'
    });
  }
});

// Bulk acknowledge alerts
router.put('/alerts/bulk-acknowledge', async (req, res) => {
  try {
    const { alert_ids } = req.body;
    
    if (!Array.isArray(alert_ids) || alert_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'alert_ids must be a non-empty array'
      });
    }
    
    const result = await db.query(
      `UPDATE alerts 
       SET status = 'acknowledged', acknowledged_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($1) AND status = 'active'
       RETURNING *`,
      [alert_ids]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error bulk acknowledging alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk acknowledge alerts'
    });
  }
});

module.exports = router;