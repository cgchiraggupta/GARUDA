import React from 'react';
import { AlertTriangle, Clock, MapPin, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext.tsx';

const AlertsPanel: React.FC = () => {
  const { alerts, loading } = useData();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'error':
        return '🟠';
      case 'warning':
        return '🟡';
      case 'info':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading.alerts) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-16 w-full rounded"></div>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No active alerts</p>
        <p className="text-sm text-gray-400">System is operating normally</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {alerts.slice(0, 10).map((alert) => (
        <div
          key={alert.id}
          className={`border-l-4 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
            alert.severity === 'critical' ? 'border-l-red-500' :
            alert.severity === 'error' ? 'border-l-orange-500' :
            alert.severity === 'warning' ? 'border-l-yellow-500' :
            'border-l-blue-500'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {alert.title}
                </h4>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                  {alert.severity}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {alert.message}
              </p>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                {alert.chainage_km && (
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {alert.chainage_km.toFixed(1)} km
                  </div>
                )}
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(alert.created_at)}
                </div>
                {alert.route_name && (
                  <div className="text-xs text-gray-400 truncate">
                    {alert.route_name}
                  </div>
                )}
              </div>
            </div>
            
            <button className="ml-2 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      
      {alerts.length > 10 && (
        <div className="p-4 text-center border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing 10 of {alerts.length} alerts
          </p>
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
