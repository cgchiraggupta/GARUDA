import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Train, AlertTriangle, MapPin, Gauge } from 'lucide-react';
import { useData } from '../contexts/DataContext.tsx';
import { useWebSocket } from '../contexts/WebSocketContext.tsx';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom train icon
const trainIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 6.5V7.5C15 8.3 14.3 9 13.5 9H10.5C9.7 9 9 8.3 9 7.5V6.5L3 7V9L9 8.5V19H11V14H13V19H15V8.5L21 9Z" fill="#1E40AF"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Custom alert icon
const alertIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L1 21H23L12 2ZM12 17H12.01V19H12V17ZM12 9V15H12.01V9H12Z" fill="#DC2626"/>
    </svg>
  `),
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

// Custom defect icon
const defectIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#F59E0B"/>
    </svg>
  `),
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -9],
});

const MapView: React.FC = () => {
  const { 
    selectedRoute, 
    trainPositions, 
    defects, 
    alerts, 
    routes,
    loading 
  } = useData();
  
  const { isConnected } = useWebSocket();
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(6);

  // Mock route geometry data - in real app, this would come from API
  const routeGeometry = {
    1: [ // Delhi-Mumbai
      [28.6139, 77.2090], [27.4924, 77.6737], [27.1767, 78.0081], 
      [25.4484, 78.5685], [23.2599, 77.4126], [22.3072, 73.1812], 
      [19.0760, 72.8777]
    ],
    2: [ // Chennai-Bangalore
      [13.0827, 80.2707], [12.9716, 79.1596], [12.5657, 78.5742], 
      [12.9716, 77.5946]
    ],
    3: [ // Howrah-New Delhi
      [22.5851, 88.3468], [23.7957, 86.4304], [24.7969, 85.0009], 
      [26.4499, 80.3319], [28.6139, 77.2090]
    ]
  };

  useEffect(() => {
    if (selectedRoute && routeGeometry[selectedRoute.id as keyof typeof routeGeometry]) {
      const geometry = routeGeometry[selectedRoute.id as keyof typeof routeGeometry];
      if (geometry.length > 0) {
        // Calculate center of route
        const avgLat = geometry.reduce((sum, coord) => sum + coord[0], 0) / geometry.length;
        const avgLng = geometry.reduce((sum, coord) => sum + coord[1], 0) / geometry.length;
        setMapCenter([avgLat, avgLng]);
        setMapZoom(8);
      }
    } else {
      // Reset to India view
      setMapCenter([20.5937, 78.9629]);
      setMapZoom(6);
    }
  }, [selectedRoute]);

  const getDefectIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return new L.Icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#DC2626"/>
              <path d="M12 6V14M12 18H12.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          `),
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
      case 'high':
        return new L.Icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" fill="#F59E0B"/>
              <path d="M12 8V12M12 16H12.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          `),
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
      default:
        return defectIcon;
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return new L.Icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L1 21H23L12 2ZM12 17H12.01V19H12V17ZM12 9V15H12.01V9H12Z" fill="#DC2626"/>
            </svg>
          `),
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
      case 'error':
        return new L.Icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L1 21H23L12 2ZM12 17H12.01V19H12V17ZM12 9V15H12.01V9H12Z" fill="#F59E0B"/>
            </svg>
          `),
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
      default:
        return alertIcon;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Live Map View</h1>
            <p className="text-sm text-gray-600">
              {selectedRoute 
                ? `Monitoring ${selectedRoute.name}` 
                : 'Real-time railway monitoring across all routes'
              }
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {trainPositions.length} trains • {defects.length} defects • {alerts.length} alerts
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route Lines */}
          {selectedRoute && routeGeometry[selectedRoute.id as keyof typeof routeGeometry] && (
            <Polyline
              positions={routeGeometry[selectedRoute.id as keyof typeof routeGeometry]}
              color="#1E40AF"
              weight={4}
              opacity={0.8}
            />
          )}

          {/* All Routes (when no specific route selected) */}
          {!selectedRoute && Object.entries(routeGeometry).map(([routeId, geometry]) => (
            <Polyline
              key={routeId}
              positions={geometry}
              color="#6B7280"
              weight={2}
              opacity={0.6}
            />
          ))}

          {/* Train Markers */}
          {trainPositions.map((train) => (
            <Marker
              key={train.id}
              position={[train.latitude, train.longitude]}
              icon={trainIcon}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-gray-900">Train {train.train_number}</h3>
                  <p className="text-sm text-gray-600">{train.route_name}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Speed:</span>
                      <span className="text-sm font-medium">{train.speed_kmh.toFixed(0)} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Chainage:</span>
                      <span className="text-sm font-medium">{train.chainage_km.toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Direction:</span>
                      <span className="text-sm font-medium capitalize">{train.direction}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Vibration:</span>
                      <span className="text-sm font-medium">{train.vibration_level.toFixed(1)} m/s²</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Defect Markers */}
          {defects.map((defect) => (
            <Marker
              key={defect.id}
              position={[defect.latitude || 0, defect.longitude || 0]}
              icon={getDefectIcon(defect.severity)}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {defect.defect_type.replace('_', ' ')} Defect
                  </h3>
                  <p className="text-sm text-gray-600">{defect.route_name}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Severity:</span>
                      <span className={`text-sm font-medium ${
                        defect.severity === 'critical' ? 'text-red-600' :
                        defect.severity === 'high' ? 'text-orange-600' :
                        defect.severity === 'medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {defect.severity}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Chainage:</span>
                      <span className="text-sm font-medium">{defect.chainage_km.toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Confidence:</span>
                      <span className="text-sm font-medium">{defect.confidence_score.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Status:</span>
                      <span className="text-sm font-medium capitalize">{defect.status}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Alert Markers */}
          {alerts.map((alert) => (
            <Marker
              key={alert.id}
              position={[alert.latitude || 0, alert.longitude || 0]}
              icon={getAlertIcon(alert.severity)}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                  <p className="text-sm text-gray-600">{alert.route_name}</p>
                  <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Severity:</span>
                      <span className={`text-sm font-medium ${
                        alert.severity === 'critical' ? 'text-red-600' :
                        alert.severity === 'error' ? 'text-orange-600' :
                        alert.severity === 'warning' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Chainage:</span>
                      <span className="text-sm font-medium">{alert.chainage_km?.toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Status:</span>
                      <span className="text-sm font-medium capitalize">{alert.status}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Loading Overlay */}
        {loading.trains || loading.defects || loading.alerts ? (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="spinner"></div>
              <span className="text-sm text-gray-600">Loading data...</span>
            </div>
          </div>
        ) : null}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Legend</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Train Position</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Critical Defect</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>High Priority Defect</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span>Alert</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-blue-500"></div>
              <span>Railway Route</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
