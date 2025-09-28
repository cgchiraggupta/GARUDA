import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`📡 API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error);
    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Routes
  getRoutes: () => api.get('/v1/routes'),
  getRoute: (id: number) => api.get(`/v1/routes/${id}`),
  getRouteLiveData: (id: number) => api.get(`/v1/routes/${id}/live`),
  getRouteGeometry: (id: number, params?: any) => api.get(`/v1/routes/${id}/geometry`, { params }),
  getRouteDefects: (id: number, params?: any) => api.get(`/v1/routes/${id}/defects`, { params }),

  // Track Geometry
  getTrackGeometry: (params?: any) => api.get('/v1/tracks/geometry', { params }),
  getTrackGeometryStats: (params?: any) => api.get('/v1/tracks/geometry/stats', { params }),
  getTrackGeometryViolations: (params?: any) => api.get('/v1/tracks/geometry/violations', { params }),

  // Sensor Readings
  getSensorReadings: (params?: any) => api.get('/v1/tracks/sensor-readings', { params }),
  getSensorStats: (params?: any) => api.get('/v1/tracks/sensor-readings/stats', { params }),

  // Defects
  getActiveDefects: (params?: any) => api.get('/v1/defects/active', { params }),
  getDefectStats: (params?: any) => api.get('/v1/defects/stats', { params }),
  getDefectsByType: (params?: any) => api.get('/v1/defects/by-type', { params }),
  getDefect: (id: number) => api.get(`/v1/defects/${id}`),
  updateDefectStatus: (id: number, data: any) => api.put(`/v1/defects/${id}/status`, data),
  createDefect: (data: any) => api.post('/v1/defects', data),

  // Maintenance
  getMaintenanceSchedule: (params?: any) => api.get('/v1/maintenance/schedule', { params }),
  getMaintenanceStats: (params?: any) => api.get('/v1/maintenance/stats', { params }),
  getMaintenanceByType: (params?: any) => api.get('/v1/maintenance/by-type', { params }),
  getMaintenance: (id: number) => api.get(`/v1/maintenance/${id}`),
  createMaintenance: (data: any) => api.post('/v1/maintenance', data),
  updateMaintenance: (id: number, data: any) => api.put(`/v1/maintenance/${id}`, data),

  // Analytics
  getDashboardAnalytics: (params?: any) => api.get('/v1/analytics/dashboard', { params }),
  getTrendAnalysis: (params?: any) => api.get('/v1/analytics/trends', { params }),
  getPredictiveAnalytics: (params?: any) => api.get('/v1/analytics/predictive', { params }),
  getComplianceReport: (params?: any) => api.get('/v1/analytics/compliance', { params }),

  // Alerts
  getAlerts: (params?: any) => api.get('/v1/alerts', { params }),
  getAlertStats: (params?: any) => api.get('/v1/alerts/stats', { params }),
  getAlertsByType: (params?: any) => api.get('/v1/alerts/by-type', { params }),
  getAlert: (id: number) => api.get(`/v1/alerts/${id}`),
  createAlert: (data: any) => api.post('/v1/alerts', data),
  updateAlertStatus: (id: number, data: any) => api.put(`/v1/alerts/${id}/status`, data),
  bulkAcknowledgeAlerts: (data: any) => api.put('/v1/alerts/bulk-acknowledge', data),

  // Health check
  getHealth: () => api.get('/health'),
};

export default api;
