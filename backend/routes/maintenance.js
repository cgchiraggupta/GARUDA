const express = require('express');
const db = require('../database/connection');

const router = express.Router();

// Get maintenance schedule
router.get('/maintenance/schedule', async (req, res) => {
  try {
    const { route_id, status, start_date, end_date, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        mr.*,
        r.name as route_name,
        r.start_station,
        r.end_station
      FROM maintenance_records mr
      JOIN routes r ON mr.route_id = r.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (route_id) {
      paramCount++;
      query += ` AND mr.route_id = $${paramCount}`;
      params.push(parseInt(route_id));
    }
    
    if (status) {
      paramCount++;
      query += ` AND mr.status = $${paramCount}`;
      params.push(status);
    }
    
    if (start_date) {
      paramCount++;
      query += ` AND mr.scheduled_date >= $${paramCount}`;
      params.push(new Date(start_date));
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND mr.scheduled_date <= $${paramCount}`;
      params.push(new Date(end_date));
    }
    
    query += ` ORDER BY mr.scheduled_date ASC LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching maintenance schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch maintenance schedule'
    });
  }
});

// Get maintenance statistics
router.get('/maintenance/stats', async (req, res) => {
  try {
    const { route_id, months = 6 } = req.query;
    
    const result = await db.query(`
      SELECT 
        r.id as route_id,
        r.name as route_name,
        COUNT(mr.id) as total_maintenance,
        COUNT(CASE WHEN mr.status = 'completed' THEN 1 END) as completed_maintenance,
        COUNT(CASE WHEN mr.status = 'scheduled' THEN 1 END) as scheduled_maintenance,
        COUNT(CASE WHEN mr.status = 'in_progress' THEN 1 END) as in_progress_maintenance,
        SUM(CASE WHEN mr.status = 'completed' THEN mr.cost ELSE 0 END) as total_cost,
        AVG(CASE WHEN mr.status = 'completed' THEN mr.cost ELSE NULL END) as avg_cost,
        MIN(mr.scheduled_date) as earliest_scheduled,
        MAX(mr.scheduled_date) as latest_scheduled
      FROM routes r
      LEFT JOIN maintenance_records mr ON r.id = mr.route_id 
        AND mr.scheduled_date > NOW() - INTERVAL '${parseInt(months)} months'
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
    console.error('Error fetching maintenance statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch maintenance statistics'
    });
  }
});

// Get maintenance by type
router.get('/maintenance/by-type', async (req, res) => {
  try {
    const { route_id, months = 6 } = req.query;
    
    const result = await db.query(`
      SELECT 
        mr.maintenance_type,
        COUNT(*) as count,
        COUNT(CASE WHEN mr.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN mr.status = 'scheduled' THEN 1 END) as scheduled_count,
        AVG(mr.cost) as avg_cost,
        SUM(mr.cost) as total_cost
      FROM maintenance_records mr
      JOIN routes r ON mr.route_id = r.id
      WHERE mr.scheduled_date > NOW() - INTERVAL '${parseInt(months)} months'
    ` + (route_id ? ' AND mr.route_id = $1' : '') + `
      GROUP BY mr.maintenance_type
      ORDER BY count DESC
    `, route_id ? [parseInt(route_id)] : []);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching maintenance by type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch maintenance by type'
    });
  }
});

// Create new maintenance record
router.post('/maintenance', async (req, res) => {
  try {
    const {
      route_id,
      chainage_start_km,
      chainage_end_km,
      maintenance_type,
      scheduled_date,
      cost,
      description,
      contractor
    } = req.body;
    
    // Validate required fields
    if (!route_id || !chainage_start_km || !chainage_end_km || !maintenance_type || !scheduled_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: route_id, chainage_start_km, chainage_end_km, maintenance_type, scheduled_date'
      });
    }
    
    const result = await db.query(
      `INSERT INTO maintenance_records (route_id, chainage_start_km, chainage_end_km, maintenance_type, scheduled_date, cost, description, contractor) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [route_id, chainage_start_km, chainage_end_km, maintenance_type, scheduled_date, cost, description, contractor]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create maintenance record'
    });
  }
});

// Update maintenance record
router.put('/maintenance/:id', async (req, res) => {
  try {
    const maintenanceId = parseInt(req.params.id);
    const {
      status,
      completed_date,
      cost,
      description,
      contractor
    } = req.body;
    
    // Validate status if provided
    if (status && !['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: scheduled, in_progress, completed, cancelled'
      });
    }
    
    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }
    
    if (completed_date) {
      paramCount++;
      updates.push(`completed_date = $${paramCount}`);
      params.push(completed_date);
    }
    
    if (cost !== undefined) {
      paramCount++;
      updates.push(`cost = $${paramCount}`);
      params.push(cost);
    }
    
    if (description) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }
    
    if (contractor) {
      paramCount++;
      updates.push(`contractor = $${paramCount}`);
      params.push(contractor);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    paramCount++;
    params.push(maintenanceId);
    
    const query = `UPDATE maintenance_records SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const result = await db.query(query, params);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance record not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating maintenance record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update maintenance record'
    });
  }
});

// Get maintenance record details
router.get('/maintenance/:id', async (req, res) => {
  try {
    const maintenanceId = parseInt(req.params.id);
    
    const result = await db.query(`
      SELECT 
        mr.*,
        r.name as route_name,
        r.start_station,
        r.end_station
      FROM maintenance_records mr
      JOIN routes r ON mr.route_id = r.id
      WHERE mr.id = $1
    `, [maintenanceId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance record not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching maintenance record details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch maintenance record details'
    });
  }
});

module.exports = router;