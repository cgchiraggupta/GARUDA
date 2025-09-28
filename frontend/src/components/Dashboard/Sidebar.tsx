import React from 'react';
import { motion } from 'framer-motion';
import { 
  Map, 
  Camera, 
  BarChart3, 
  Train, 
  AlertTriangle, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useData } from '../../contexts/DataContext.tsx';

interface SidebarProps {
  collapsed: boolean;
  activeView: 'map' | 'camera' | 'analytics';
  onViewChange: (view: 'map' | 'camera' | 'analytics') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, activeView, onViewChange }) => {
  const { routes, selectedRoute, selectRoute } = useData();

  const navigationItems = [
    { key: 'map', label: 'Map View', icon: Map },
    { key: 'camera', label: 'Camera', icon: Camera },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-danger-500';
      case 'high': return 'text-danger-600';
      case 'medium': return 'text-secondary-500';
      case 'low': return 'text-success-500';
      default: return 'text-gray-500';
    }
  };

  const getSeverityCount = (severity: string) => {
    return selectedRoute ? 
      routes.find(r => r.id === selectedRoute.id)?.active_defects || 0 : 0;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      className="fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 shadow-sm z-40"
    >
      <div className="h-full flex flex-col">
        {/* Navigation */}
        <div className="p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.key;
              
              return (
                <button
                  key={item.key}
                  onClick={() => onViewChange(item.key as any)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Route Selection */}
        {!collapsed && (
          <div className="px-4 pb-4">
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Active Routes</h3>
              <div className="space-y-2">
                {routes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => selectRoute(route)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedRoute?.id === route.id
                        ? 'border-primary-200 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {route.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {route.start_station} → {route.end_station}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        {route.active_defects > 0 && (
                          <div className="flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-danger-500" />
                            <span className="text-xs text-danger-600 font-medium">
                              {route.active_defects}
                            </span>
                          </div>
                        )}
                        <Train className="w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>{route.distance_km} km</span>
                      <span>{route.max_speed_kmh} km/h</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* System Status */}
        {!collapsed && (
          <div className="px-4 pb-4 mt-auto">
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">System Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Active Trains</span>
                  <span className="font-medium text-gray-900">
                    {routes.reduce((sum, route) => sum + (route.active_defects || 0), 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Defects</span>
                  <span className="font-medium text-gray-900">
                    {routes.reduce((sum, route) => sum + (route.active_defects || 0), 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Maintenance Due</span>
                  <span className="font-medium text-gray-900">
                    {routes.reduce((sum, route) => sum + (route.scheduled_maintenance || 0), 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed State - Show Icons Only */}
        {collapsed && (
          <div className="px-2 pb-4 mt-auto">
            <div className="space-y-2">
              {routes.slice(0, 3).map((route) => (
                <button
                  key={route.id}
                  onClick={() => selectRoute(route)}
                  className={`w-full p-2 rounded-lg transition-colors ${
                    selectedRoute?.id === route.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title={route.name}
                >
                  <Train className="w-4 h-4 mx-auto" />
                  {route.active_defects > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-danger-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
};

export default Sidebar;
