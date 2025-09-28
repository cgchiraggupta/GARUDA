const db = require('./connection');

// Indian Railway Routes Data
const routes = [
  {
    name: 'Delhi-Mumbai Central',
    start_station: 'New Delhi',
    end_station: 'Mumbai Central',
    distance_km: 1384.0,
    track_gauge_mm: 1676,
    max_speed_kmh: 160
  },
  {
    name: 'Chennai-Bangalore',
    start_station: 'Chennai Central',
    end_station: 'Bangalore City',
    distance_km: 362.0,
    track_gauge_mm: 1676,
    max_speed_kmh: 120
  },
  {
    name: 'Howrah-New Delhi',
    start_station: 'Howrah',
    end_station: 'New Delhi',
    distance_km: 1447.0,
    track_gauge_mm: 1676,
    max_speed_kmh: 160
  }
];

// GPS coordinates for major stations (approximate)
const stationCoordinates = {
  'New Delhi': { lat: 28.644800, lng: 77.216721 },
  'Mumbai Central': { lat: 19.017615, lng: 72.856164 },
  'Chennai Central': { lat: 13.082680, lng: 80.270721 },
  'Bangalore City': { lat: 12.976230, lng: 77.603287 },
  'Howrah': { lat: 22.585770, lng: 88.347221 }
};

// Generate intermediate GPS points between stations
function generateRoutePoints(startCoord, endCoord, distanceKm, pointsPerKm = 4) {
  const points = [];
  const totalPoints = Math.floor(distanceKm * pointsPerKm);
  
  for (let i = 0; i <= totalPoints; i++) {
    const ratio = i / totalPoints;
    const lat = startCoord.lat + (endCoord.lat - startCoord.lat) * ratio;
    const lng = startCoord.lng + (endCoord.lng - startCoord.lng) * ratio;
    const chainage = (i / pointsPerKm);
    
    points.push({
      chainage_km: chainage,
      latitude: lat,
      longitude: lng
    });
  }
  
  return points;
}

// Generate realistic track geometry data
function generateTrackGeometry(routePoints, routeId) {
  return routePoints.map(point => {
    // Add realistic variations to track geometry
    const baseGauge = 1676.0;
    const gaugeVariation = (Math.random() - 0.5) * 10; // ±5mm variation
    
    const alignmentVariation = (Math.random() - 0.5) * 8; // ±4mm alignment
    const twistVariation = (Math.random() - 0.5) * 6; // ±3mm twist
    const crossLevelVariation = (Math.random() - 0.5) * 4; // ±2mm cross level
    
    return {
      route_id: routeId,
      chainage_km: point.chainage_km,
      latitude: point.latitude,
      longitude: point.longitude,
      gauge_mm: baseGauge + gaugeVariation,
      alignment_mm: alignmentVariation,
      twist_mm: twistVariation,
      cross_level_mm: crossLevelVariation,
      vertical_profile_mm: (Math.random() - 0.5) * 3,
      horizontal_curvature_radius_m: Math.random() > 0.8 ? 1000 + Math.random() * 5000 : null,
      vertical_curvature_radius_m: Math.random() > 0.9 ? 2000 + Math.random() * 8000 : null
    };
  });
}

// Generate defects along the route
function generateDefects(routeId, distanceKm) {
  const defects = [];
  const defectCount = Math.floor(distanceKm * 0.02); // 2% of track length
  
  for (let i = 0; i < defectCount; i++) {
    const chainage = Math.random() * distanceKm;
    const defectTypes = ['crack', 'wear', 'misalignment', 'loose_fastening', 'ballast_degradation'];
    const severities = ['low', 'medium', 'high', 'critical'];
    const severityWeights = [0.4, 0.3, 0.2, 0.1]; // Weighted distribution
    
    const defectType = defectTypes[Math.floor(Math.random() * defectTypes.length)];
    const severity = getWeightedRandom(severities, severityWeights);
    
    defects.push({
      route_id: routeId,
      chainage_km: chainage,
      defect_type: defectType,
      severity: severity,
      description: `${defectType.replace('_', ' ')} detected at chainage ${chainage.toFixed(3)} km`,
      confidence_score: 0.7 + Math.random() * 0.3,
      repair_priority: severities.indexOf(severity) + 1,
      estimated_repair_cost: getRepairCost(defectType, severity)
    });
  }
  
  return defects;
}

function getWeightedRandom(items, weights) {
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

function getRepairCost(defectType, severity) {
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

// Generate maintenance records
function generateMaintenanceRecords(routeId, distanceKm) {
  const records = [];
  const maintenanceTypes = ['track_renewal', 'ballast_cleaning', 'fastening_replacement', 'alignment_correction'];
  
  // Generate past maintenance (last 6 months)
  for (let i = 0; i < 20; i++) {
    const startChainage = Math.random() * (distanceKm - 10);
    const endChainage = startChainage + Math.random() * 10;
    const maintenanceType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
    
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() - Math.floor(Math.random() * 180));
    
    const completedDate = new Date(scheduledDate);
    completedDate.setDate(completedDate.getDate() + Math.floor(Math.random() * 7));
    
    records.push({
      route_id: routeId,
      chainage_start_km: startChainage,
      chainage_end_km: endChainage,
      maintenance_type: maintenanceType,
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      completed_date: completedDate.toISOString().split('T')[0],
      status: 'completed',
      cost: 50000 + Math.random() * 200000,
      description: `${maintenanceType.replace('_', ' ')} from ${startChainage.toFixed(3)} to ${endChainage.toFixed(3)} km`,
      contractor: `Railway Contractor ${Math.floor(Math.random() * 10) + 1}`
    });
  }
  
  // Generate future maintenance (next 3 months)
  for (let i = 0; i < 10; i++) {
    const startChainage = Math.random() * (distanceKm - 10);
    const endChainage = startChainage + Math.random() * 10;
    const maintenanceType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
    
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + Math.floor(Math.random() * 90));
    
    records.push({
      route_id: routeId,
      chainage_start_km: startChainage,
      chainage_end_km: endChainage,
      maintenance_type: maintenanceType,
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      status: 'scheduled',
      cost: 50000 + Math.random() * 200000,
      description: `${maintenanceType.replace('_', ' ')} from ${startChainage.toFixed(3)} to ${endChainage.toFixed(3)} km`,
      contractor: `Railway Contractor ${Math.floor(Math.random() * 10) + 1}`
    });
  }
  
  return records;
}

// Main seeding function
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data
    await db.query('TRUNCATE TABLE alerts, sensor_readings, train_positions, defects, maintenance_records, track_geometry, routes RESTART IDENTITY CASCADE');
    
    // Insert routes
    console.log('📊 Inserting routes...');
    for (const route of routes) {
      const result = await db.query(
        'INSERT INTO routes (name, start_station, end_station, distance_km, track_gauge_mm, max_speed_kmh) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [route.name, route.start_station, route.end_station, route.distance_km, route.track_gauge_mm, route.max_speed_kmh]
      );
      const routeId = result.rows[0].id;
      
      console.log(`  ✅ Route ${route.name} inserted with ID ${routeId}`);
      
      // Generate route points
      const startCoord = stationCoordinates[route.start_station];
      const endCoord = stationCoordinates[route.end_station];
      const routePoints = generateRoutePoints(startCoord, endCoord, route.distance_km);
      
      // Insert track geometry
      console.log(`  📍 Inserting track geometry for ${route.name}...`);
      const trackGeometry = generateTrackGeometry(routePoints, routeId);
      
      for (const geometry of trackGeometry) {
        await db.query(
          `INSERT INTO track_geometry (route_id, chainage_km, latitude, longitude, gauge_mm, alignment_mm, twist_mm, cross_level_mm, vertical_profile_mm, horizontal_curvature_radius_m, vertical_curvature_radius_m) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [geometry.route_id, geometry.chainage_km, geometry.latitude, geometry.longitude, geometry.gauge_mm, geometry.alignment_mm, geometry.twist_mm, geometry.cross_level_mm, geometry.vertical_profile_mm, geometry.horizontal_curvature_radius_m, geometry.vertical_curvature_radius_m]
        );
      }
      
      // Insert defects
      console.log(`  ⚠️  Inserting defects for ${route.name}...`);
      const defects = generateDefects(routeId, route.distance_km);
      
      for (const defect of defects) {
        await db.query(
          `INSERT INTO defects (route_id, chainage_km, defect_type, severity, description, confidence_score, repair_priority, estimated_repair_cost) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [defect.route_id, defect.chainage_km, defect.defect_type, defect.severity, defect.description, defect.confidence_score, defect.repair_priority, defect.estimated_repair_cost]
        );
      }
      
      // Insert maintenance records
      console.log(`  🔧 Inserting maintenance records for ${route.name}...`);
      const maintenanceRecords = generateMaintenanceRecords(routeId, route.distance_km);
      
      for (const record of maintenanceRecords) {
        await db.query(
          `INSERT INTO maintenance_records (route_id, chainage_start_km, chainage_end_km, maintenance_type, scheduled_date, completed_date, status, cost, description, contractor) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [record.route_id, record.chainage_start_km, record.chainage_end_km, record.maintenance_type, record.scheduled_date, record.completed_date, record.status, record.cost, record.description, record.contractor]
        );
      }
    }
    
    // Insert some initial alerts
    console.log('🚨 Inserting initial alerts...');
    const alerts = [
      {
        route_id: 1,
        alert_type: 'speed_restriction',
        severity: 'warning',
        message: 'Speed restriction of 80 km/h due to track maintenance at chainage 245.5 km',
        chainage_km: 245.5,
        latitude: 26.2389,
        longitude: 73.0243
      },
      {
        route_id: 2,
        alert_type: 'defect_detected',
        severity: 'error',
        message: 'High severity crack detected at chainage 156.2 km',
        chainage_km: 156.2,
        latitude: 12.9716,
        longitude: 77.5946
      },
      {
        route_id: 3,
        alert_type: 'maintenance_due',
        severity: 'info',
        message: 'Scheduled maintenance due in 7 days at chainage 892.1 km',
        chainage_km: 892.1,
        latitude: 25.3176,
        longitude: 82.9739
      }
    ];
    
    for (const alert of alerts) {
      await db.query(
        `INSERT INTO alerts (route_id, alert_type, severity, message, chainage_km, latitude, longitude) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [alert.route_id, alert.alert_type, alert.severity, alert.message, alert.chainage_km, alert.latitude, alert.longitude]
      );
    }
    
    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Seeded ${routes.length} routes with realistic Indian railway data`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };