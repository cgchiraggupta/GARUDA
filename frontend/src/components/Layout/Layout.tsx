import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  BarChart3, 
  Camera, 
  Train, 
  AlertTriangle,
  Wifi,
  WifiOff,
  Menu,
  X
} from 'lucide-react';
import { useWebSocket } from '../../contexts/WebSocketContext.tsx';
import { useData } from '../../contexts/DataContext.tsx';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { isConnected, connectionStatus } = useWebSocket();
  const { selectedRoute, routes, selectRoute } = useData();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Map View', href: '/map', icon: Map },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Camera', href: '/camera', icon: Camera },
  ];

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-lg overflow-hidden">
                <img
                  src="/brand-symbol.png"
                  alt=""
                  className="h-8 w-8 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='12' fill='%231F4B99'/><text x='32' y='36' text-anchor='middle' font-family='Arial' font-size='24' fill='white'>IT</text></svg>";
                  }}
                />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">ITMS</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                    isActive
                      ? 'bg-railway-blue text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          {/* Logo */}
            <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <div className="h-8 w-8 rounded-lg overflow-hidden">
              <img
                src="/brand-symbol.png"
                alt=""
                className="h-8 w-8 object-cover"
                onError={(e) => {
                  e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='12' fill='%231F4B99'/><text x='32' y='36' text-anchor='middle' font-family='Arial' font-size='24' fill='white'>IT</text></svg>";
                }}
              />
            </div>
            <span className="ml-2 text-xl font-bold text-gray-900">ITMS</span>
            <span className="ml-2 text-sm text-gray-500">Demo</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-railway-blue text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Route Selection */}
          <div className="px-4 py-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Route
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-railway-blue focus:border-railway-blue"
              value={selectedRoute?.id || ''}
              onChange={(e) => {
                const route = routes.find(r => r.id === parseInt(e.target.value));
                if (route) {
                  selectRoute(route);
                }
              }}
            >
              <option value="">All Routes</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>

          {/* System Status */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">System Status</span>
              <div className="flex items-center">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className={`ml-1 text-xs ${getConnectionStatusColor()}`}>
                  {getConnectionStatusText()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center justify-between bg-white border-b border-gray-200 px-4 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-gray-600 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="ml-4 text-xl font-semibold text-gray-900 lg:ml-0">
              {location.pathname === '/' || location.pathname === '/dashboard' ? 'Dashboard' :
               location.pathname === '/map' ? 'Map View' :
               location.pathname === '/analytics' ? 'Analytics' :
               location.pathname === '/camera' ? 'Camera View' : 'ITMS'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Route indicator */}
            {selectedRoute && (
              <div className="hidden sm:flex items-center px-3 py-1 bg-railway-blue text-white text-sm rounded-full">
                <Train className="h-4 w-4 mr-1" />
                {selectedRoute.name}
              </div>
            )}

            {/* Connection status */}
            <div className="flex items-center">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
            </div>

            {/* Alert indicator */}
            <div className="relative">
              <AlertTriangle className="h-5 w-5 text-gray-400" />
              {alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'error').length > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
