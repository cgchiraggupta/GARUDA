import React, { useEffect } from 'react';
import { 
  Train, 
  AlertTriangle, 
  Activity, 
  MapPin, 
  Gauge, 
  TrendingUp,
  Clock,
  Users
} from 'lucide-react';
import { useData } from '../contexts/DataContext.tsx';
import { useWebSocket } from '../contexts/WebSocketContext.tsx';
import MetricCard from '../components/Dashboard/MetricCard';
import RecentActivity from '../components/Dashboard/RecentActivity';
import TrainPositions from '../components/Dashboard/TrainPositions';
import AlertsPanel from '../components/Dashboard/AlertsPanel';
import TrackGeometryChart from '../components/Dashboard/TrackGeometryChart';

const Dashboard: React.FC = () => {
  const { 
    dashboardStats, 
    selectedRoute, 
    routes, 
    loading,
    refreshDashboardStats 
  } = useData();
  
  const { isConnected } = useWebSocket();

  useEffect(() => {
    refreshDashboardStats(selectedRoute?.id);
  }, [selectedRoute]);

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Online';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Offline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedRoute ? `${selectedRoute.name} Dashboard` : 'ITMS Overview'}
          </h1>
          <p className="text-gray-600">
            {selectedRoute 
              ? `Monitoring ${selectedRoute.distance_km} km of track from ${selectedRoute.start_station} to ${selectedRoute.end_station}`
              : 'Indigenous Track Monitoring System - Real-time Railway Infrastructure Monitoring'
            }
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {getStatusText(isConnected ? 'connected' : 'disconnected')}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* System Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Trains"
          value={dashboardStats?.system?.active_trains || 0}
          icon={Train}
          color="blue"
          loading={loading.dashboard}
        />
        <MetricCard
          title="Total Defects"
          value={dashboardStats?.system?.total_defects || 0}
          icon={AlertTriangle}
          color="red"
          loading={loading.dashboard}
          subtitle={`${dashboardStats?.system?.critical_defects || 0} critical`}
        />
        <MetricCard
          title="Camera Errors"
          value={dashboardStats?.system?.camera_errors || 0}
          icon={AlertTriangle}
          color="orange"
          loading={loading.dashboard}
          subtitle={`${dashboardStats?.system?.recent_camera_errors || 0} recent`}
        />
        <MetricCard
          title="Active Alerts"
          value={dashboardStats?.system?.active_alerts || 0}
          icon={AlertTriangle}
          color="yellow"
          loading={loading.dashboard}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Track Length"
          value={`${dashboardStats?.system?.total_track_length || 0} km`}
          icon={MapPin}
          color="green"
          loading={loading.dashboard}
        />
        <MetricCard
          title="Routes Monitored"
          value={dashboardStats?.system?.total_routes || 0}
          icon={Activity}
          color="purple"
          loading={loading.dashboard}
        />
        <MetricCard
          title="Scheduled Maintenance"
          value={dashboardStats?.system?.scheduled_maintenance || 0}
          icon={Clock}
          color="indigo"
          loading={loading.dashboard}
        />
        <MetricCard
          title="System Health"
          value={dashboardStats?.system?.camera_errors > 0 ? "Degraded" : "Good"}
          icon={dashboardStats?.system?.camera_errors > 0 ? AlertTriangle : Activity}
          color={dashboardStats?.system?.camera_errors > 0 ? "red" : "green"}
          loading={loading.dashboard}
        />
      </div>

      {/* Route-specific metrics */}
      {selectedRoute && dashboardStats?.route && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Track Gauge"
            value={`${dashboardStats.route.avg_gauge?.toFixed(1) || 0} mm`}
            icon={Gauge}
            color="blue"
            subtitle="Average"
            loading={loading.dashboard}
          />
          <MetricCard
            title="Alignment Deviation"
            value={`${dashboardStats.route.avg_alignment_deviation?.toFixed(1) || 0} mm`}
            icon={TrendingUp}
            color="yellow"
            subtitle="Average"
            loading={loading.dashboard}
          />
          <MetricCard
            title="Max Speed"
            value={`${dashboardStats.route.max_current_speed?.toFixed(0) || 0} km/h`}
            icon={Clock}
            color="green"
            subtitle="Current"
            loading={loading.dashboard}
          />
          <MetricCard
            title="Active Defects"
            value={dashboardStats.route.active_defects || 0}
            icon={AlertTriangle}
            color="red"
            subtitle="Requiring Attention"
            loading={loading.dashboard}
          />
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Train Positions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Live Train Positions</h3>
            </div>
            <div className="card-body">
              <TrainPositions />
            </div>
          </div>

          {/* Track Geometry Chart */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Track Geometry Parameters</h3>
            </div>
            <div className="card-body">
              <TrackGeometryChart />
            </div>
          </div>
        </div>

        {/* Right column - 1/3 width */}
        <div className="space-y-6">
          {/* Alerts Panel */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Active Alerts</h3>
            </div>
            <div className="card-body p-0">
              <AlertsPanel />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="card-body p-0">
              <RecentActivity />
            </div>
          </div>

          {/* System Status */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">System Status</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">WebSocket Connection</span>
                  <span className={`text-sm font-medium ${getStatusColor(isConnected ? 'connected' : 'disconnected')}`}>
                    {getStatusText(isConnected ? 'connected' : 'disconnected')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Data Updates</span>
                  <span className="text-sm font-medium text-green-600">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Simulation Engine</span>
                  <span className="text-sm font-medium text-green-600">Running</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database</span>
                  <span className="text-sm font-medium text-green-600">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Route Selection for Mobile */}
      <div className="lg:hidden">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Select Route</h3>
          </div>
          <div className="card-body">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-railway-blue focus:border-railway-blue"
              value={selectedRoute?.id || ''}
              onChange={(e) => {
                const route = routes.find(r => r.id === parseInt(e.target.value));
                // This will be handled by the DataContext
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
