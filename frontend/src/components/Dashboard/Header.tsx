import React from 'react';
import { motion } from 'framer-motion';
import { Menu, Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  isConnected: boolean;
}

const Header: React.FC<HeaderProps> = ({
  sidebarCollapsed,
  onToggleSidebar,
  connectionStatus,
  isConnected
}) => {
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'connecting':
        return <Wifi className="w-5 h-5 text-secondary-500 animate-pulse" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-danger-500" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-400" />;
    }
  };

  const getConnectionText = () => {
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

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-success-600';
      case 'connecting':
        return 'text-secondary-600';
      case 'error':
        return 'text-danger-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🚂</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ITMS</h1>
                <p className="text-sm text-gray-500">Indigenous Track Monitoring System</p>
              </div>
            </div>
          </div>

          {/* Center - System Status */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              {getConnectionIcon()}
              <span className={`text-sm font-medium ${getConnectionColor()}`}>
                {getConnectionText()}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">System Online</span>
            </div>
            
            <div className="text-sm text-gray-500">
              {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Live Data Indicator */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center space-x-2 bg-success-50 px-3 py-1 rounded-full"
            >
              <div className="w-2 h-2 bg-success-500 rounded-full"></div>
              <span className="text-sm font-medium text-success-700">LIVE</span>
            </motion.div>

            {/* System Info */}
            <div className="text-right text-sm text-gray-500">
              <div>SIH 2025 Demo</div>
              <div>Version 1.0.0</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
