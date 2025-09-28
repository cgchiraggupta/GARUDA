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

interface DataContextType {
  routes: Route[];
  selectedRoute: Route | null;
  trains: Train[];
  defects: Defect[];
  alerts: Alert[];
  sensorReadings: SensorReading[];
  loading: boolean;
  error: string | null;
  selectRoute: (route: Route) => void;
  refreshData: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { subscribe, unsubscribe, joinRoom, leaveRoom } = useWebSocket();

  const loadRoutes = useCallback(async () => {
    try {
      const response = await apiService.getRoutes();
      // Axios response body shape: { success: boolean, data: Route[], count: number }
      // Ensure we set the actual array of routes
      setRoutes(response.data?.data || []);
      
      // Select first route by default
      if (response.data?.data?.length > 0 && !selectedRoute) {
        setSelectedRoute(response.data.data[0]);
      }
    } catch (err) {
      console.error('Error loading routes:', err);
      setError('Failed to load routes');
    }
  }, [selectedRoute]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await loadRoutes();
      
      if (selectedRoute) {
        await loadRouteData(selectedRoute.id);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadRoutes, selectedRoute]);

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

    // Subscribe to WebSocket topics
    subscribe('train-tracking');
    subscribe('sensor-data');
    subscribe('defect-detection');
    subscribe('alerts');

    // Add event listeners
    window.addEventListener('ws-train-tracking', handleTrainUpdate as EventListener);
    window.addEventListener('ws-sensor-data', handleSensorUpdate as EventListener);
    window.addEventListener('ws-defect-detection', handleDefectUpdate as EventListener);
    window.addEventListener('ws-alerts', handleAlertUpdate as EventListener);

    return () => {
      // Unsubscribe from topics
      unsubscribe('train-tracking');
      unsubscribe('sensor-data');
      unsubscribe('defect-detection');
      unsubscribe('alerts');

      // Remove event listeners
      window.removeEventListener('ws-train-tracking', handleTrainUpdate as EventListener);
      window.removeEventListener('ws-sensor-data', handleSensorUpdate as EventListener);
      window.removeEventListener('ws-defect-detection', handleDefectUpdate as EventListener);
      window.removeEventListener('ws-alerts', handleAlertUpdate as EventListener);
    };
  }, [subscribe, unsubscribe]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const value: DataContextType = {
    routes,
    selectedRoute,
    trains,
    defects,
    alerts,
    sensorReadings,
    loading,
    error,
    selectRoute,
    refreshData,
    getRouteLiveData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};