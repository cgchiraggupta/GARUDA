import React from 'react';
import { motion } from 'framer-motion';
import { 
  Gauge, 
  TrendingUp, 
  AlertTriangle, 
  Activity,
  MapPin,
  Clock,
  Zap,
  CheckCircle
} from 'lucide-react';
import { useData } from '../../contexts/DataContext.tsx';

const MonitoringPanels: React.FC = () => {
  const { selectedRoute, trains, defects, alerts, sensorReadings } = useData();

  // Calculate track geometry parameters
  const getTrackGeometryData = () => {
    if (!sensorReadings.length) return null;
    
    const latest = sensorReadings[0];
    return {
      gauge: 1676 + (Math.random() - 0.5) * 10, // Simulated gauge variation
      alignment: (Math.random() - 0.5) * 8, // Simulated alignment
      twist: (Math.random() - 0.5) * 6, // Simulated twist
      crossLevel: (Math.random() - 0.5) * 4, // Simulated cross level
    };
  };

  const trackGeometry = getTrackGeometryData();

  // Get latest sensor readings
  const latestSensorReading = sensorReadings[0];

  // Calculate defect statistics
  const defectStats = {
    total: defects.length,
    critical: defects.filter(d => d.severity === 'critical').length,
    high: defects.filter(d => d.severity === 'high').length,
    medium: defects.filter(d => d.severity === 'medium').length,
    low: defects.filter(d => d.severity === 'low').length,
  };

  // Get active alerts
  const activeAlerts = alerts.filter(a => a.status === 'active');

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: string;
  }> = ({ title, value, icon, color, trend }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="card-content">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {trend && (
              <p className="text-xs text-gray-500 mt-1">{trend}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
            {icon}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const GaugeCard: React.FC<{
    title: string;
    value: number;
    unit: string;
    min: number;
    max: number;
    optimal: { min: number; max: number };
    color: string;
  }> = ({ title, value, unit, min, max, optimal, color }) => {
    const percentage = ((value - min) / (max - min)) * 100;
    const isOptimal = value >= optimal.min && value <= optimal.max;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="card-content">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
            <div className="relative w-24 h-24 mx-auto mb-2">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={isOptimal ? '#059669' : '#DC2626'}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${percentage * 2.51} 251`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${isOptimal ? 'text-success-600' : 'text-danger-600'}`}>
                  {value.toFixed(1)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500">{unit}</p>
            <p className={`text-xs mt-1 ${isOptimal ? 'text-success-600' : 'text-danger-600'}`}>
              {isOptimal ? 'Optimal' : 'Out of Range'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Active Trains"
            value={trains.length}
            icon={<Activity className="w-6 h-6 text-primary-600" />}
            color="text-primary-600"
            trend="+2 from last hour"
          />
          <StatCard
            title="Total Defects"
            value={defectStats.total}
            icon={<AlertTriangle className="w-6 h-6 text-danger-600" />}
            color="text-danger-600"
            trend={`${defectStats.critical} critical`}
          />
        </div>
      </div>

      {/* Track Geometry Parameters */}
      {trackGeometry && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Track Geometry</h2>
          <div className="grid grid-cols-2 gap-4">
            <GaugeCard
              title="Gauge Width"
              value={trackGeometry.gauge}
              unit="mm"
              min={1660}
              max={1690}
              optimal={{ min: 1671, max: 1681 }}
              color="text-primary-600"
            />
            <GaugeCard
              title="Alignment"
              value={Math.abs(trackGeometry.alignment)}
              unit="mm"
              min={0}
              max={10}
              optimal={{ min: 0, max: 4 }}
              color="text-secondary-600"
            />
            <GaugeCard
              title="Twist"
              value={Math.abs(trackGeometry.twist)}
              unit="mm"
              min={0}
              max={8}
              optimal={{ min: 0, max: 3 }}
              color="text-success-600"
            />
            <GaugeCard
              title="Cross Level"
              value={Math.abs(trackGeometry.crossLevel)}
              unit="mm"
              min={0}
              max={6}
              optimal={{ min: 0, max: 2 }}
              color="text-danger-600"
            />
          </div>
        </div>
      )}

      {/* Sensor Data */}
      {latestSensorReading && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sensor Readings</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Vibration Level"
              value={latestSensorReading.vibration_level.toFixed(2)}
              icon={<Zap className="w-6 h-6 text-secondary-600" />}
              color="text-secondary-600"
              trend="Normal range"
            />
            <StatCard
              title="Temperature"
              value={`${latestSensorReading.temperature_celsius?.toFixed(1) || 'N/A'}°C`}
              icon={<Activity className="w-6 h-6 text-success-600" />}
              color="text-success-600"
              trend="Optimal"
            />
          </div>
        </div>
      )}

      {/* Active Alerts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h2>
        <div className="card">
          <div className="card-content">
            {activeAlerts.length > 0 ? (
              <div className="space-y-3">
                {activeAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      alert.severity === 'critical' ? 'bg-danger-500' :
                      alert.severity === 'error' ? 'bg-danger-600' :
                      alert.severity === 'warning' ? 'bg-secondary-500' :
                      'bg-primary-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {alert.alert_type.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {alert.message}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {alert.chainage_km?.toFixed(3)} km
                        </span>
                        <Clock className="w-3 h-3 text-gray-400 ml-2" />
                        <span className="text-xs text-gray-500">
                          {new Date(alert.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {activeAlerts.length > 5 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{activeAlerts.length - 5} more alerts
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No active alerts</p>
                <p className="text-xs text-gray-500">All systems operating normally</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Defect Summary */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Defect Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Critical"
            value={defectStats.critical}
            icon={<AlertTriangle className="w-6 h-6 text-danger-600" />}
            color="text-danger-600"
          />
          <StatCard
            title="High Priority"
            value={defectStats.high}
            icon={<AlertTriangle className="w-6 h-6 text-danger-500" />}
            color="text-danger-500"
          />
          <StatCard
            title="Medium"
            value={defectStats.medium}
            icon={<AlertTriangle className="w-6 h-6 text-secondary-500" />}
            color="text-secondary-500"
          />
          <StatCard
            title="Low"
            value={defectStats.low}
            icon={<AlertTriangle className="w-6 h-6 text-success-500" />}
            color="text-success-500"
          />
        </div>
      </div>
    </div>
  );
};

export default MonitoringPanels;
