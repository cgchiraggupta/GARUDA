import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx';
import MapView from '../Map/MapView.tsx';
import MonitoringPanels from './MonitoringPanels.tsx';
import CameraPanel from '../Camera/CameraPanel.tsx';
import AnalyticsPanel from './AnalyticsPanel.tsx';
import { useData } from '../../contexts/DataContext.tsx';
import { useWebSocket } from '../../contexts/WebSocketContext.tsx';

const Dashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'map' | 'camera' | 'analytics'>('map');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { selectedRoute, loading } = useData();
  const { isConnected, connectionStatus } = useWebSocket();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ITMS Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header 
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        connectionStatus={connectionStatus}
        isConnected={isConnected}
      />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          collapsed={sidebarCollapsed}
          activeView={activeView}
          onViewChange={setActiveView}
        />

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          <div className="p-6">
            {/* Route Selection Header */}
            {selectedRoute && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <div className="card">
                  <div className="card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                          {selectedRoute.name}
                        </h1>
                        <p className="text-gray-600">
                          {selectedRoute.start_station} → {selectedRoute.end_station}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>Distance: {selectedRoute.distance_km} km</span>
                          <span>Max Speed: {selectedRoute.max_speed_kmh} km/h</span>
                          <span>Track Gauge: {selectedRoute.track_gauge_mm} mm</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="status-indicator">
                          <div className="status-online"></div>
                          <span className="text-sm text-gray-600">Live Monitoring</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* View Toggle */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                {[
                  { key: 'map', label: 'Map View', icon: '🗺️' },
                  { key: 'camera', label: 'Camera', icon: '📹' },
                  { key: 'analytics', label: 'Analytics', icon: '📊' }
                ].map((view) => (
                  <button
                    key={view.key}
                    onClick={() => setActiveView(view.key as any)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeView === view.key
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-2">{view.icon}</span>
                    {view.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Map/Camera/Analytics */}
              <div className="lg:col-span-2">
                <motion.div
                  key={activeView}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeView === 'map' && <MapView />}
                  {activeView === 'camera' && <CameraPanel />}
                  {activeView === 'analytics' && <AnalyticsPanel />}
                </motion.div>
              </div>

              {/* Right Column - Monitoring Panels */}
              <div className="space-y-6">
                <MonitoringPanels />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
