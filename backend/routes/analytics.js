const express = require('express');
const db = require('../database/connection');

const router = express.Router();

// Get dashboard analytics
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const { route_id, days = 30 } = req.query;
    
    // Get overall system statistics
    const systemStats = await db.query(`
      SELECT 
        COUNT(DISTINCT r.id) as total_routes,
        COUNT(DISTINCT d.id) as total_defects,
        COUNT(DISTINCT CASE WHEN d.severity = 'critical' THEN d.id END) as critical_defects,
        COUNT(DISTINCT CASE WHEN d.severity = 'high' THEN d.id END) as high_defects,
        COUNT(DISTINCT mr.id) as scheduled_maintenance,
        COUNT(DISTINCT a.id) as active_alerts,
        SUM(r.distance_km) as total_track_length
      FROM routes r
      LEFT JOIN defects d ON r.id = d.route_id AND d.status = 'active'
      LEFT JOIN maintenance_records mr ON r.id = mr.route_id AND mr.status = 'scheduled'
      LEFT JOIN alerts a ON r.id = a.route_id AND a.status = 'active'
    `);
    
    // Get recent activity
    const recentActivity = await db.query(`
      SELECT 
        'defect' as type,
        d.defect_type as description,
        d.severity,
        d.detected_at as timestamp,
        r.name as route_name
      FROM defects d
      JOIN routes r ON d.route_id = r.id
      WHERE d.detected_at > NOW() - INTERVAL '${parseInt(days)} days'
      
      UNION ALL
      
      SELECT 
        'maintenance' as type,
        mr.maintenance_type as description,
        mr.status as severity,
        mr.scheduled_date as timestamp,
        r.name as route_name
      FROM maintenance_records mr
      JOIN routes r ON mr.route_id = r.id
      WHERE mr.scheduled_date > NOW() - INTERVAL '${parseInt(days)} days'
      
      UNION ALL
      
      SELECT 
        'alert' as type,
        a.alert_type as description,
        a.severity,
        a.created_at as timestamp,
        r.name as route_name
      FROM alerts a
      JOIN routes r ON a.route_id = r.id
      WHERE a.created_at > NOW() - INTERVAL '${parseInt(days)} days'
      
      ORDER BY timestamp DESC
      LIMIT 50
    `);
    
    // Get performance metrics
    const performanceMetrics = await db.query(`
      SELECT 
        r.id as route_id,
        r.name as route_name,
        COUNT(DISTINCT d.id) as defect_count,
        COUNT(DISTINCT CASE WHEN d.severity = 'critical' THEN d.id END) as critical_defects,
        COUNT(DISTINCT mr.id) as maintenance_count,
        AVG(sr.vibration_level) as avg_vibration,
        MAX(sr.vibration_level) as max_vibration,
        COUNT(DISTINCT CASE WHEN ABS(tg.gauge_mm - 1676) > 5 THEN tg.id END) as gauge_violations
      FROM routes r
      LEFT JOIN defects d ON r.id = d.route_id AND d.status = 'active'
      LEFT JOIN maintenance_records mr ON r.id = mr.route_id AND mr.status = 'scheduled'
      LEFT JOIN sensor_readings sr ON r.id = sr.route_id AND sr.timestamp > NOW() - INTERVAL '24 hours'
      LEFT JOIN track_geometry tg ON r.id = tg.route_id
    ` + (route_id ? ' WHERE r.id = $1' : '') + `
      GROUP BY r.id, r.name
      ORDER BY r.name
    `, route_id ? [parseInt(route_id)] : []);
    
    res.json({
      success: true,
      data: {
        system_stats: systemStats.rows[0],
        recent_activity: recentActivity.rows,
        performance_metrics: performanceMetrics.rows,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard analytics'
    });
  }
});

// Get trend analysis
router.get('/analytics/trends', async (req, res) => {
  try {
    const { route_id, days = 30, metric } = req.query;
    
    let query = '';
    let params = [];
    
    switch (metric) {
      case 'defects':
        query = `
          SELECT 
            DATE(d.detected_at) as date,
            COUNT(*) as count,
            COUNT(CASE WHEN d.severity = 'critical' THEN 1 END) as critical_count,
            COUNT(CASE WHEN d.severity = 'high' THEN 1 END) as high_count,
            COUNT(CASE WHEN d.severity = 'medium' THEN 1 END) as medium_count,
            COUNT(CASE WHEN d.severity = 'low' THEN 1 END) as low_count
          FROM defects d
          JOIN routes r ON d.route_id = r.id
          WHERE d.detected_at > NOW() - INTERVAL '${parseInt(days)} days'
        `;
        if (route_id) {
          query += ' AND d.route_id = $1';
          params.push(parseInt(route_id));
        }
        query += ' GROUP BY DATE(d.detected_at) ORDER BY date';
        break;
        
      case 'maintenance':
        query = `
          SELECT 
            DATE(mr.scheduled_date) as date,
            COUNT(*) as count,
            COUNT(CASE WHEN mr.status = 'completed' THEN 1 END) as completed_count,
            COUNT(CASE WHEN mr.status = 'scheduled' THEN 1 END) as scheduled_count,
            AVG(mr.cost) as avg_cost
          FROM maintenance_records mr
          JOIN routes r ON mr.route_id = r.id
          WHERE mr.scheduled_date > NOW() - INTERVAL '${parseInt(days)} days'
        `;
        if (route_id) {
          query += ' AND mr.route_id = $1';
          params.push(parseInt(route_id));
        }
        query += ' GROUP BY DATE(mr.scheduled_date) ORDER BY date';
        break;
        
      case 'vibration':
        query = `
          SELECT 
            DATE(sr.timestamp) as date,
            AVG(sr.vibration_level) as avg_vibration,
            MAX(sr.vibration_level) as max_vibration,
            MIN(sr.vibration_level) as min_vibration,
            COUNT(*) as reading_count
          FROM sensor_readings sr
          JOIN routes r ON sr.route_id = r.id
          WHERE sr.timestamp > NOW() - INTERVAL '${parseInt(days)} days'
        `;
        if (route_id) {
          query += ' AND sr.route_id = $1';
          params.push(parseInt(route_id));
        }
        query += ' GROUP BY DATE(sr.timestamp) ORDER BY date';
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid metric. Must be one of: defects, maintenance, vibration'
        });
    }
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
      metric: metric,
      days: parseInt(days)
    });
  } catch (error) {
    console.error('Error fetching trend analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trend analysis'
    });
  }
});

// Get predictive maintenance insights
router.get('/analytics/predictive', async (req, res) => {
  try {
    const { route_id, days_ahead = 30 } = req.query;
    
    // Get current defect patterns
    const defectPatterns = await db.query(`
      SELECT 
        r.id as route_id,
        r.name as route_name,
        d.defect_type,
        COUNT(*) as count,
        AVG(d.confidence_score) as avg_confidence,
        AVG(d.estimated_repair_cost) as avg_cost
      FROM defects d
      JOIN routes r ON d.route_id = r.id
      WHERE d.status = 'active'
    ` + (route_id ? ' AND d.route_id = $1' : '') + `
      GROUP BY r.id, r.name, d.defect_type
      ORDER BY count DESC
    `, route_id ? [parseInt(route_id)] : []);
    
    // Get maintenance history patterns
    const maintenancePatterns = await db.query(`
      SELECT 
        r.id as route_id,
        r.name as route_name,
        mr.maintenance_type,
        COUNT(*) as count,
        AVG(mr.cost) as avg_cost,
        AVG(EXTRACT(DAYS FROM (mr.completed_date - mr.scheduled_date))) as avg_duration_days
      FROM maintenance_records mr
      JOIN routes r ON mr.route_id = r.id
      WHERE mr.status = 'completed'
        AND mr.completed_date > NOW() - INTERVAL '6 months'
    ` + (route_id ? ' AND mr.route_id = $1' : '') + `
      GROUP BY r.id, r.name, mr.maintenance_type
      ORDER BY count DESC
    `, route_id ? [parseInt(route_id)] : []);
    
    // Get upcoming maintenance recommendations
    const recommendations = await db.query(`
      SELECT 
        r.id as route_id,
        r.name as route_name,
        tg.chainage_km,
        'track_renewal' as recommended_type,
        'High vibration levels detected' as reason,
        'high' as priority,
        (tg.chainage_km * 1000) as estimated_cost
      FROM track_geometry tg
      JOIN routes r ON tg.route_id = r.id
      JOIN sensor_readings sr ON tg.route_id = sr.route_id 
        AND ABS(tg.chainage_km - sr.chainage_km) < 0.1
      WHERE sr.timestamp > NOW() - INTERVAL '24 hours'
        AND sr.vibration_level > 2.0
    ` + (route_id ? ' AND tg.route_id = $1' : '') + `
      GROUP BY r.id, r.name, tg.chainage_km
      ORDER BY tg.chainage_km
      LIMIT 20
    `, route_id ? [parseInt(route_id)] : []);
    
    res.json({
      success: true,
      data: {
        defect_patterns: defectPatterns.rows,
        maintenance_patterns: maintenancePatterns.rows,
        recommendations: recommendations.rows,
        analysis_period: `${parseInt(days_ahead)} days ahead`,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching predictive analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch predictive analytics'
    });
  }
});

// Get compliance report
router.get('/analytics/compliance', async (req, res) => {
  try {
    const { route_id } = req.query;
    
    // EN 13848 compliance analysis
    const complianceData = await db.query(`
      SELECT 
        r.id as route_id,
        r.name as route_name,
        COUNT(tg.id) as total_points,
        COUNT(CASE WHEN ABS(tg.gauge_mm - 1676) <= 5 THEN 1 END) as gauge_compliant,
        COUNT(CASE WHEN ABS(tg.alignment_mm) <= 4 THEN 1 END) as alignment_compliant,
        COUNT(CASE WHEN ABS(tg.twist_mm) <= 3 THEN 1 END) as twist_compliant,
        COUNT(CASE WHEN ABS(tg.cross_level_mm) <= 2 THEN 1 END) as cross_level_compliant,
        ROUND(
          (COUNT(CASE WHEN ABS(tg.gauge_mm - 1676) <= 5 AND ABS(tg.alignment_mm) <= 4 AND ABS(tg.twist_mm) <= 3 AND ABS(tg.cross_level_mm) <= 2 THEN 1 END) * 100.0 / COUNT(tg.id))::numeric, 2
        ) as overall_compliance_percentage
      FROM routes r
      LEFT JOIN track_geometry tg ON r.id = tg.route_id
    ` + (route_id ? ' WHERE r.id = $1' : '') + `
      GROUP BY r.id, r.name
      ORDER BY overall_compliance_percentage DESC
    `, route_id ? [parseInt(route_id)] : []);
    
    // RDSO compliance summary
    const rdsocompliance = await db.query(`
      SELECT 
        'EN 13848-1' as standard,
        'Track Geometry' as parameter,
        COUNT(CASE WHEN ABS(tg.gauge_mm - 1676) <= 5 THEN 1 END) as compliant_points,
        COUNT(tg.id) as total_points,
        ROUND((COUNT(CASE WHEN ABS(tg.gauge_mm - 1676) <= 5 THEN 1 END) * 100.0 / COUNT(tg.id))::numeric, 2) as compliance_percentage
      FROM track_geometry tg
      JOIN routes r ON tg.route_id = r.id
    ` + (route_id ? ' WHERE r.id = $1' : '') + `
      
      UNION ALL
      
      SELECT 
        'EN 13848-1' as standard,
        'Alignment' as parameter,
        COUNT(CASE WHEN ABS(tg.alignment_mm) <= 4 THEN 1 END) as compliant_points,
        COUNT(tg.id) as total_points,
        ROUND((COUNT(CASE WHEN ABS(tg.alignment_mm) <= 4 THEN 1 END) * 100.0 / COUNT(tg.id))::numeric, 2) as compliance_percentage
      FROM track_geometry tg
      JOIN routes r ON tg.route_id = r.id
    ` + (route_id ? ' WHERE r.id = $1' : '') + `
      
      UNION ALL
      
      SELECT 
        'EN 13848-1' as standard,
        'Twist' as parameter,
        COUNT(CASE WHEN ABS(tg.twist_mm) <= 3 THEN 1 END) as compliant_points,
        COUNT(tg.id) as total_points,
        ROUND((COUNT(CASE WHEN ABS(tg.twist_mm) <= 3 THEN 1 END) * 100.0 / COUNT(tg.id))::numeric, 2) as compliance_percentage
      FROM track_geometry tg
      JOIN routes r ON tg.route_id = r.id
    ` + (route_id ? ' WHERE r.id = $1' : '') + `
      
      UNION ALL
      
      SELECT 
        'EN 13848-1' as standard,
        'Cross Level' as parameter,
        COUNT(CASE WHEN ABS(tg.cross_level_mm) <= 2 THEN 1 END) as compliant_points,
        COUNT(tg.id) as total_points,
        ROUND((COUNT(CASE WHEN ABS(tg.cross_level_mm) <= 2 THEN 1 END) * 100.0 / COUNT(tg.id))::numeric, 2) as compliance_percentage
      FROM track_geometry tg
      JOIN routes r ON tg.route_id = r.id
    ` + (route_id ? ' WHERE r.id = $1' : '') + `
      
      ORDER BY parameter
    `, route_id ? [parseInt(route_id)] : []);
    
    res.json({
      success: true,
      data: {
        route_compliance: complianceData.rows,
        standard_compliance: rdsocompliance.rows,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching compliance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance report'
    });
  }
});

module.exports = router;