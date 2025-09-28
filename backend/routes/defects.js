const express = require('express');
const db = require('../database/connection');

const router = express.Router();

// Get all active defects
router.get('/defects/active', async (req, res) => {
  try {
    const { route_id, severity, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        d.*,
        r.name as route_name,
        r.start_station,
        r.end_station
      FROM defects d
      JOIN routes r ON d.route_id = r.id
      WHERE d.status = 'active'
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (route_id) {
      paramCount++;
      query += ` AND d.route_id = $${paramCount}`;
      params.push(parseInt(route_id));
    }
    
    if (severity) {
      paramCount++;
      query += ` AND d.severity = $${paramCount}`;
      params.push(severity);
    }
    
    query += ` ORDER BY d.severity DESC, d.detected_at DESC LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching active defects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active defects'
    });
  }
});

// Get defect statistics
router.get('/defects/stats', async (req, res) => {
  try {
    const { route_id } = req.query;
    
    let query = `
      SELECT 
        r.id as route_id,
        r.name as route_name,
        COUNT(d.id) as total_defects,
        COUNT(CASE WHEN d.severity = 'critical' THEN 1 END) as critical_defects,
        COUNT(CASE WHEN d.severity = 'high' THEN 1 END) as high_defects,
        COUNT(CASE WHEN d.severity = 'medium' THEN 1 END) as medium_defects,
        COUNT(CASE WHEN d.severity = 'low' THEN 1 END) as low_defects,
        COUNT(CASE WHEN d.defect_type = 'crack' THEN 1 END) as crack_defects,
        COUNT(CASE WHEN d.defect_type = 'wear' THEN 1 END) as wear_defects,
        COUNT(CASE WHEN d.defect_type = 'misalignment' THEN 1 END) as misalignment_defects,
        AVG(d.confidence_score) as avg_confidence,
        SUM(d.estimated_repair_cost) as total_repair_cost
      FROM routes r
      LEFT JOIN defects d ON r.id = d.route_id AND d.status = 'active'
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
    console.error('Error fetching defect statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch defect statistics'
    });
  }
});

// Get defects by type
router.get('/defects/by-type', async (req, res) => {
  try {
    const { route_id } = req.query;
    
    let query = `
      SELECT 
        d.defect_type,
        COUNT(*) as count,
        AVG(d.confidence_score) as avg_confidence,
        COUNT(CASE WHEN d.severity = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN d.severity = 'high' THEN 1 END) as high_count,
        COUNT(CASE WHEN d.severity = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN d.severity = 'low' THEN 1 END) as low_count
      FROM defects d
      JOIN routes r ON d.route_id = r.id
      WHERE d.status = 'active'
    `;
    
    const params = [];
    
    if (route_id) {
      query += ' AND d.route_id = $1';
      params.push(parseInt(route_id));
    }
    
    query += ' GROUP BY d.defect_type ORDER BY count DESC';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching defects by type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch defects by type'
    });
  }
});

// Update defect status
router.put('/defects/:id/status', async (req, res) => {
  try {
    const defectId = parseInt(req.params.id);
    const { status, notes } = req.body;
    
    if (!['active', 'investigating', 'repaired', 'monitoring'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: active, investigating, repaired, monitoring'
      });
    }
    
    const result = await db.query(
      'UPDATE defects SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, defectId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Defect not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating defect status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update defect status'
    });
  }
});

// Create new defect
router.post('/defects', async (req, res) => {
  try {
    const {
      route_id,
      chainage_km,
      defect_type,
      severity,
      description,
      confidence_score,
      repair_priority,
      estimated_repair_cost
    } = req.body;
    
    // Validate required fields
    if (!route_id || !chainage_km || !defect_type || !severity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: route_id, chainage_km, defect_type, severity'
      });
    }
    
    // Validate severity
    if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid severity. Must be one of: low, medium, high, critical'
      });
    }
    
    const result = await db.query(
      `INSERT INTO defects (route_id, chainage_km, defect_type, severity, description, confidence_score, repair_priority, estimated_repair_cost) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [route_id, chainage_km, defect_type, severity, description, confidence_score || 0.8, repair_priority || 1, estimated_repair_cost]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating defect:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create defect'
    });
  }
});

// Get defect details
router.get('/defects/:id', async (req, res) => {
  try {
    const defectId = parseInt(req.params.id);
    
    const result = await db.query(`
      SELECT 
        d.*,
        r.name as route_name,
        r.start_station,
        r.end_station
      FROM defects d
      JOIN routes r ON d.route_id = r.id
      WHERE d.id = $1
    `, [defectId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Defect not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching defect details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch defect details'
    });
  }
});

module.exports = router;