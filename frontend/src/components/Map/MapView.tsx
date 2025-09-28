import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { Train, AlertTriangle, MapPin, Clock } from 'lucide-react';
import { useData } from '../../contexts/DataContext.tsx';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom train icon
const trainIcon = new L.DivIcon({
  html: `
    <div class="train-marker">
      <div class="train-icon">🚂</div>
      <div class="train-pulse"></div>
    </div>
  `,
  className: 'custom-train-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Custom defect icon
const defectIcon = new L.DivIcon({
  html: `
    <div class="defect-marker">
      <div class="defect-icon">⚠️</div>
    </div>
  `,
  className: 'custom-defect-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Custom alert icon
const alertIcon = new L.DivIcon({
  html: `
    <div class="alert-marker">
      <div class="alert-icon">🚨</div>
    </div>
  `,
  className: 'custom-alert-marker',
  iconSize: [25, 25],
  iconAnchor: [12, 12],
});

interface MapViewProps {}

const MapView: React.FC<MapViewProps> = () => {
  const { selectedRoute, trains, defects, alerts } = useData();
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(6);

  // Load route geometry when route changes
  useEffect(() => {
    if (selectedRoute) {
      loadRouteGeometry(selectedRoute.id);
    }
  }, [selectedRoute]);

  const loadRouteGeometry = async (routeId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/routes/${routeId}/geometry?limit=1000`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        const geometry = data.data.map((point: any) => [point.latitude, point.longitude] as [number, number]);
        setRouteGeometry(geometry);
        
        // Set map center to route center
        if (geometry.length > 0) {
          const centerLat = geometry.reduce((sum: number, point: [number, number]) => sum + point[0], 0) / geometry.length;
          const centerLng = geometry.reduce((sum: number, point: [number, number]) => sum + point[1], 0) / geometry.length;
          setMapCenter([centerLat, centerLng]);
          setMapZoom(8);
        }
      }
    } catch (error) {
      console.error('Error loading route geometry:', error);
    }
  };

  const getDefectColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#F59E0B';
      case 'low': return '#059669';
      default: return '#6B7280';
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'error': return '#EA580C';
      case 'warning': return '#F59E0B';
      case 'info': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  if (!selectedRoute) {
    return (
      <div className="card h-96 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Select a route to view the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card h-96 overflow-hidden">
      <div className="card-header">
        <h3 className="text-lg font-semibold text-gray-900">Live Track Monitoring</h3>
        <p className="text-sm text-gray-600">{selectedRoute.name}</p>
      </div>
      <div className="card-content p-0 h-80">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          key={`${selectedRoute.id}-${mapCenter[0]}-${mapCenter[1]}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Route Line */}
          {routeGeometry.length > 0 && (
            <Polyline
              positions={routeGeometry}
              color="#1E40AF"
              weight={4}
              opacity={0.8}
            />
          )}
          
          {/* Train Markers */}
          {trains.map((train) => (
            <Marker
              key={train.id}
              position={[train.latitude, train.longitude]}
              icon={trainIcon}
            >
              <Popup>
                <div className="p-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Train className="w-4 h-4 text-primary-600" />
                    <span className="font-semibold text-gray-900">{train.id}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Route:</span>
                      <span className="font-medium">{train.routeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Speed:</span>
                      <span className="font-medium">{train.speed.toFixed(1)} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Chainage:</span>
                      <span className="font-medium">{train.chainage.toFixed(3)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Direction:</span>
                      <span className="font-medium capitalize">{train.direction}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Update:</span>
                      <span className="font-medium">
                        {new Date(train.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Defect Markers */}
          {defects.slice(0, 50).map((defect) => (
            <Marker
              key={`defect-${defect.id}`}
              position={[defect.latitude || 0, defect.longitude || 0]}
              icon={defectIcon}
            >
              <Popup>
                <div className="p-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-danger-600" />
                    <span className="font-semibold text-gray-900">
                      {defect.defect_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Severity:</span>
                      <span className={`font-medium capitalize ${
                        defect.severity === 'critical' ? 'text-danger-600' :
                        defect.severity === 'high' ? 'text-danger-500' :
                        defect.severity === 'medium' ? 'text-secondary-500' :
                        'text-success-500'
                      }`}>
                        {defect.severity}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Chainage:</span>
                      <span className="font-medium">{defect.chainage_km.toFixed(3)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Confidence:</span>
                      <span className="font-medium">{(defect.confidence_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Detected:</span>
                      <span className="font-medium">
                        {new Date(defect.detected_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      {defect.description}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Alert Markers */}
          {alerts.filter(a => a.status === 'active').slice(0, 20).map((alert) => (
            <Marker
              key={`alert-${alert.id}`}
              position={[alert.latitude, alert.longitude]}
              icon={alertIcon}
            >
              <Popup>
                <div className="p-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-danger-600" />
                    <span className="font-semibold text-gray-900">
                      {alert.alert_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Severity:</span>
                      <span className={`font-medium capitalize ${
                        alert.severity === 'critical' ? 'text-danger-600' :
                        alert.severity === 'error' ? 'text-danger-500' :
                        alert.severity === 'warning' ? 'text-secondary-500' :
                        'text-primary-500'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Chainage:</span>
                      <span className="font-medium">{alert.chainage_km?.toFixed(3)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      {alert.message}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;
