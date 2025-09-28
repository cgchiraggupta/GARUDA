import React from 'react';
import { Activity, AlertTriangle, Wrench, Train } from 'lucide-react';
import { useData } from '../../contexts/DataContext.tsx';

const RecentActivity: React.FC = () => {
  const { dashboardStats, loading } = useData();

  const getActivityIcon = (type: string, subtype: string) => {
    if (type === 'defect') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (type === 'alert') {
      switch (subtype) {
        case 'maintenance_due':
          return <Wrench className="h-4 w-4 text-yellow-500" />;
        case 'track_geometry':
          return <Activity className="h-4 w-4 text-blue-500" />;
        default:
          return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      }
    }
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getActivityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-red-500';
      case 'error':
        return 'text-orange-500';
      case 'warning':
        return 'text-yellow-500';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
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

  if (loading.dashboard) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="skeleton-avatar"></div>
            <div className="flex-1 space-y-1">
              <div className="skeleton-text"></div>
              <div className="skeleton h-3 w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activities = dashboardStats?.recent_activity || [];

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No recent activity</p>
        <p className="text-sm text-gray-400">Activity will appear here as it occurs</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {activities.slice(0, 10).map((activity, index) => (
        <div
          key={index}
          className="flex items-start space-x-3 p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
        >
          <div className="flex-shrink-0 mt-0.5">
            {getActivityIcon(activity.type, activity.subtype)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {activity.type === 'defect' 
                  ? `${activity.subtype.replace('_', ' ')} detected`
                  : activity.subtype.replace('_', ' ')
                }
              </p>
              <span className={`text-xs font-medium ${getActivityColor(activity.severity)}`}>
                {activity.severity}
              </span>
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>{activity.route_name}</span>
              {activity.chainage_km && (
                <span>{activity.chainage_km.toFixed(1)} km</span>
              )}
              <span>{formatTime(activity.timestamp)}</span>
            </div>
          </div>
        </div>
      ))}
      
      {activities.length > 10 && (
        <div className="p-4 text-center border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing 10 of {activities.length} recent activities
          </p>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
