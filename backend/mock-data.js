// Mock data for demonstration without database
const mockRoutes = [
  {
    id: 1,
    name: 'Delhi-Mumbai Central',
    start_station: 'New Delhi',
    end_station: 'Mumbai Central',
    distance_km: 1384.0,
    track_gauge_mm: 1676,
    max_speed_kmh: 160,
    geometry_points: 5536,
    active_defects: 12,
    scheduled_maintenance: 3
  },
  {
    id: 2,
    name: 'Chennai-Bangalore',
    start_station: 'Chennai Central',
    end_station: 'Bangalore City',
    distance_km: 362.0,
    track_gauge_mm: 1676,
    max_speed_kmh: 120,
    geometry_points: 1448,
    active_defects: 5,
    scheduled_maintenance: 2
  },
  {
    id: 3,
    name: 'Howrah-New Delhi',
    start_station: 'Howrah',
    end_station: 'New Delhi',
    distance_km: 1447.0,
    track_gauge_mm: 1676,
    max_speed_kmh: 160,
    geometry_points: 5788,
    active_defects: 8,
    scheduled_maintenance: 4
  }
];

const mockTrains = [
  {
    id: 'TRAIN_1_1',
    routeId: 1,
    routeName: 'Delhi-Mumbai Central',
    latitude: 28.644800 + (Math.random() - 0.5) * 0.1,
    longitude: 77.216721 + (Math.random() - 0.5) * 0.1,
    chainage: Math.random() * 1384,
    speed: 60 + Math.random() * 100,
    direction: 'forward',
    timestamp: new Date().toISOString()
  },
  {
    id: 'TRAIN_2_1',
    routeId: 2,
    routeName: 'Chennai-Bangalore',
    latitude: 13.082680 + (Math.random() - 0.5) * 0.1,
    longitude: 80.270721 + (Math.random() - 0.5) * 0.1,
    chainage: Math.random() * 362,
    speed: 60 + Math.random() * 60,
    direction: 'forward',
    timestamp: new Date().toISOString()
  }
];

const mockDefects = [
  {
    id: 1,
    route_id: 1,
    chainage_km: 245.5,
    defect_type: 'crack',
    severity: 'high',
    description: 'Longitudinal crack detected at chainage 245.5 km',
    confidence_score: 0.87,
    repair_priority: 2,
    estimated_repair_cost: 150000,
    detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    latitude: 28.644800,
    longitude: 77.216721
  },
  {
    id: 2,
    route_id: 2,
    chainage_km: 156.2,
    defect_type: 'wear',
    severity: 'medium',
    description: 'Rail wear detected at chainage 156.2 km',
    confidence_score: 0.73,
    repair_priority: 3,
    estimated_repair_cost: 75000,
    detected_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    latitude: 13.082680,
    longitude: 80.270721
  }
];

const mockAlerts = [
  {
    id: 1,
    route_id: 1,
    alert_type: 'speed_restriction',
    severity: 'warning',
    message: 'Speed restriction of 80 km/h due to track maintenance at chainage 245.5 km',
    chainage_km: 245.5,
    latitude: 28.644800,
    longitude: 77.216721,
    status: 'active',
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    route_id: 2,
    alert_type: 'defect_detected',
    severity: 'error',
    message: 'High severity crack detected at chainage 156.2 km',
    chainage_km: 156.2,
    latitude: 13.082680,
    longitude: 80.270721,
    status: 'active',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
];

const mockSensorReadings = [
  {
    id: 1,
    route_id: 1,
    chainage_km: 245.5,
    acceleration_x: (Math.random() - 0.5) * 2,
    acceleration_y: (Math.random() - 0.5) * 2,
    acceleration_z: (Math.random() - 0.5) * 2,
    vibration_level: Math.random() * 3,
    temperature_celsius: 20 + Math.random() * 30,
    humidity_percent: 40 + Math.random() * 40,
    timestamp: new Date().toISOString()
  }
];

// Generate random track geometry points
function generateTrackGeometry(routeId, distanceKm) {
  const points = [];
  const pointCount = Math.floor(distanceKm * 4); // 4 points per km
  
  for (let i = 0; i < pointCount; i++) {
    const chainage = (i / 4);
    const route = mockRoutes.find(r => r.id === routeId);
    
    if (route) {
      const startLat = routeId === 1 ? 28.644800 : routeId === 2 ? 13.082680 : 22.585770;
      const startLng = routeId === 1 ? 77.216721 : routeId === 2 ? 80.270721 : 88.347221;
      const endLat = routeId === 1 ? 19.017615 : routeId === 2 ? 12.976230 : 28.644800;
      const endLng = routeId === 1 ? 72.856164 : routeId === 2 ? 77.603287 : 77.216721;
      
      const ratio = chainage / distanceKm;
      const lat = startLat + (endLat - startLat) * ratio;
      const lng = startLng + (endLng - startLng) * ratio;
      
      points.push({
        chainage_km: chainage,
        latitude: lat,
        longitude: lng,
        gauge_mm: 1676 + (Math.random() - 0.5) * 10,
        alignment_mm: (Math.random() - 0.5) * 8,
        twist_mm: (Math.random() - 0.5) * 6,
        cross_level_mm: (Math.random() - 0.5) * 4
      });
    }
  }
  
  return points;
}

module.exports = {
  mockRoutes,
  mockTrains,
  mockDefects,
  mockAlerts,
  mockSensorReadings,
  generateTrackGeometry
};
