import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './WebSocketContext.tsx';
import { apiService } from '../services/api.ts';

interface Route {
  id: number;
  name: string;
  start_station: string;
  end_station: string;
  distance_km: number;
  track_gauge_mm: number;
  max_speed_kmh: number;
  geometry_points: number;
  active_defects: number;
  scheduled_maintenance: number;
}

interface Train {
  id: string;
  routeId: number;
  routeName: string;
  latitude: number;
  longitude: number;
  chainage: number;
  speed: number;
  direction: string;
  timestamp: string;
}

interface Defect {
  id: number;
  route_id: number;
  chainage_km: number;
  defect_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence_score: number;
  repair_priority: number;
  estimated_repair_cost: number;
  detected_at: string;
  status: string;
}

interface Alert {
  id: number;
  route_id: number;
  alert_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  chainage_km: number;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
}

interface SensorReading {
  id: number;
  route_id: number;
  chainage_km: number;
  acceleration_x: number;
  acceleration_y: number;
  acceleration_z: number;
  vibration_level: number;
  temperature_celsius: number;
  humidity_percent: number;
  timestamp: string;
}

interface DashboardStats {
  system: {
    active_trains: number;
    total_defects: number;
    critical_alerts: number;
    total_track_length: number;
    total_routes: number;
    camera_errors: number;
    recent_camera_errors: number;
  };
  route?: {
    avg_gauge: number;
    avg_alignment_deviation: number;
    max_current_speed: number;
    active_defects: number;
  };
}

interface DataContextType {
  routes: Route[];
  selectedRoute: Route | null;
  trains: Train[];
  defects: Defect[];
  alerts: Alert[];
  sensorReadings: SensorReading[];
  dashboardStats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  selectRoute: (route: Route) => void;
  refreshData: () => Promise<void>;
  refreshDashboardStats: (routeId?: number) => Promise<void>;
  getRouteLiveData: (routeId: number) => Promise<any>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: React.ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [trains, setTrains] = useState<Train[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { subscribe, unsubscribe, joinRoom, leaveRoom } = useWebSocket();

  const loadRoutes = useCallback(async (): Promise<Route[]> => {
    try {
      const response = await apiService.getRoutes();
      const list: Route[] = response.data?.data || [];
      // Set routes immediately
      setRoutes(list);
      
      // Select first route by default
      if (list.length > 0 && !selectedRoute) {
        setSelectedRoute(list[0]);
      }
      
      return list;
    } catch (err) {
      console.error('Error loading routes:', err);
      setError('Failed to load routes');
      return [];
    }
  }, [selectedRoute]);

  const loadRouteData = useCallback(async (routeId: number) => {
    try {
      const [liveData, defectsData, alertsData] = await Promise.all([
        apiService.getRouteLiveData(routeId),
        apiService.getRouteDefects(routeId),
        apiService.getAlerts({ route_id: routeId })
      ]);

      // Normalize axios responses: body is { success, data }
      setTrains(liveData.data?.data?.trains || []);
      setSensorReadings(liveData.data?.data?.sensor_readings || []);
      setDefects(defectsData.data?.data || []);
      setAlerts(alertsData.data?.data || []);
    } catch (err) {
      console.error('Error loading route data:', err);
      setError('Failed to load route data');
    }
  }, []);

  const refreshDashboardStats = useCallback(async (routeId?: number) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/analytics/dashboard');
      const data = await response.json();
      
      if (data.success) {
        // Transform the backend data to match frontend expectations
        const transformedData = {
          system: data.data.system_stats,
          route: data.data.route_stats
        };
        setDashboardStats(transformedData);
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const list = await loadRoutes();
      const initial = list[0];
      if (initial) {
        await loadRouteData(initial.id);
        // Join initial route room for real-time updates
        joinRoom(`route_${initial.id}`);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadRoutes, loadRouteData, joinRoom]);


  const selectRoute = useCallback((route: Route) => {
    setSelectedRoute(route);
    loadRouteData(route.id);
    
    // Join route-specific room for real-time updates
    if (selectedRoute) {
      leaveRoom(`route_${selectedRoute.id}`);
    }
    joinRoom(`route_${route.id}`);
  }, [selectedRoute, loadRouteData, joinRoom, leaveRoom]);

  const refreshData = useCallback(async () => {
    if (selectedRoute) {
      await loadRouteData(selectedRoute.id);
    }
  }, [selectedRoute, loadRouteData]);

  const getRouteLiveData = useCallback(async (routeId: number) => {
    try {
      return await apiService.getRouteLiveData(routeId);
    } catch (err) {
      console.error('Error getting route live data:', err);
      throw err;
    }
  }, []);

  // WebSocket event handlers
  useEffect(() => {
    const handleTrainUpdate = (event: CustomEvent) => {
      const trainData = event.detail;
      setTrains(prev => {
        const existing = prev.find(t => t.id === trainData.trainId);
        if (existing) {
          return prev.map(t => 
            t.id === trainData.trainId 
              ? { ...t, ...trainData, id: trainData.trainId }
              : t
          );
        } else {
          return [...prev, { ...trainData, id: trainData.trainId }];
        }
      });
    };

    const handleSensorUpdate = (event: CustomEvent) => {
      const sensorData = event.detail;
      setSensorReadings(prev => [sensorData, ...prev.slice(0, 99)]); // Keep last 100 readings
    };

    const handleDefectUpdate = (event: CustomEvent) => {
      const defectData = event.detail;
      setDefects(prev => [defectData.defect, ...prev]);
    };

    const handleAlertUpdate = (event: CustomEvent) => {
      const alertData = event.detail;
      setAlerts(prev => [alertData, ...prev]);
    };

    const handleCameraErrorUpdate = (event: CustomEvent) => {
      const errorData = event.detail;
      // Refresh dashboard stats when camera errors occur
      refreshDashboardStats();
    };

    // Subscribe to WebSocket topics
    subscribe('train-tracking');
    subscribe('sensor-data');
    subscribe('defect-detection');
    subscribe('alerts');
    subscribe('camera-error');

    // Add event listeners
    window.addEventListener('ws-train-tracking', handleTrainUpdate as EventListener);
    window.addEventListener('ws-sensor-data', handleSensorUpdate as EventListener);
    window.addEventListener('ws-defect-detection', handleDefectUpdate as EventListener);
    window.addEventListener('ws-alerts', handleAlertUpdate as EventListener);
    window.addEventListener('ws-camera-error', handleCameraErrorUpdate as EventListener);

    return () => {
      // Unsubscribe from topics
      unsubscribe('train-tracking');
      unsubscribe('sensor-data');
      unsubscribe('defect-detection');
      unsubscribe('alerts');
      unsubscribe('camera-error');

      // Remove event listeners
      window.removeEventListener('ws-train-tracking', handleTrainUpdate as EventListener);
      window.removeEventListener('ws-sensor-data', handleSensorUpdate as EventListener);
      window.removeEventListener('ws-defect-detection', handleDefectUpdate as EventListener);
      window.removeEventListener('ws-alerts', handleAlertUpdate as EventListener);
      window.removeEventListener('ws-camera-error', handleCameraErrorUpdate as EventListener);
    };
  }, [subscribe, unsubscribe]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
    refreshDashboardStats();
  }, [loadInitialData, refreshDashboardStats]);

  // Auto-load data whenever selectedRoute becomes available or changes
  useEffect(() => {
    if (selectedRoute) {
      loadRouteData(selectedRoute.id);
    }
  }, [selectedRoute, loadRouteData]);

  // Auto-refresh dashboard stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDashboardStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshDashboardStats]);

  const value: DataContextType = {
    routes,
    selectedRoute,
    trains,
    defects,
    alerts,
    sensorReadings,
    dashboardStats,
    loading,
    error,
    selectRoute,
    refreshData,
    refreshDashboardStats,
    getRouteLiveData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};