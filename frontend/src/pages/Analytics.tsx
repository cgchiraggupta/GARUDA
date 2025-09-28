import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle, 
  Gauge,
  Calendar,
  Download
} from 'lucide-react';
import { useData } from '../contexts/DataContext.tsx';

const Analytics: React.FC = () => {
  const { selectedRoute, dashboardStats, loading } = useData();
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('defects');

  // Mock data for charts
  const defectTrendData = [
    { date: '2024-01-01', critical: 2, high: 5, medium: 12, low: 25 },
    { date: '2024-01-02', critical: 1, high: 4, medium: 15, low: 28 },
    { date: '2024-01-03', critical: 3, high: 6, medium: 10, low: 22 },
    { date: '2024-01-04', critical: 2, high: 7, medium: 14, low: 30 },
    { date: '2024-01-05', critical: 1, high: 5, medium: 11, low: 26 },
    { date: '2024-01-06', critical: 4, high: 8, medium: 16, low: 32 },
    { date: '2024-01-07', critical: 2, high: 6, medium: 13, low: 29 },
  ];

  const trackGeometryData = [
    { parameter: 'Gauge', current: 1676.2, standard: 1676.0, deviation: 0.2, status: 'Good' },
    { parameter: 'Alignment', current: 3.2, standard: 0.0, deviation: 3.2, status: 'Warning' },
    { parameter: 'Twist', current: 2.1, standard: 0.0, deviation: 2.1, status: 'Good' },
    { parameter: 'Cross Level', current: 4.5, standard: 0.0, deviation: 4.5, status: 'Good' },
  ];

  const maintenanceData = [
    { month: 'Jan', scheduled: 12, completed: 10, overdue: 2 },
    { month: 'Feb', scheduled: 15, completed: 14, overdue: 1 },
    { month: 'Mar', scheduled: 18, completed: 16, overdue: 2 },
    { month: 'Apr', scheduled: 14, completed: 12, overdue: 2 },
    { month: 'May', scheduled: 16, completed: 15, overdue: 1 },
    { month: 'Jun', scheduled: 20, completed: 18, overdue: 2 },
  ];

  const defectTypeData = [
    { name: 'Crack', value: 35, color: '#DC2626' },
    { name: 'Wear', value: 25, color: '#F59E0B' },
    { name: 'Misalignment', value: 20, color: '#EF4444' },
    { name: 'Loose Fastener', value: 12, color: '#F97316' },
    { name: 'Ballast Degradation', value: 8, color: '#84CC16' },
  ];

  const performanceData = [
    { time: '00:00', speed: 0, vibration: 0.5, acceleration: 0.1 },
    { time: '04:00', speed: 45, vibration: 1.2, acceleration: 0.3 },
    { time: '08:00', speed: 120, vibration: 2.8, acceleration: 0.8 },
    { time: '12:00', speed: 95, vibration: 2.1, acceleration: 0.6 },
    { time: '16:00', speed: 140, vibration: 3.2, acceleration: 1.1 },
    { time: '20:00', speed: 80, vibration: 1.8, acceleration: 0.4 },
    { time: '24:00', speed: 0, vibration: 0.3, acceleration: 0.0 },
  ];

  const COLORS = ['#DC2626', '#F59E0B', '#EF4444', '#F97316', '#84CC16'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Good':
        return 'text-green-600 bg-green-100';
      case 'Warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'Critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600">
            {selectedRoute 
              ? `Performance analysis for ${selectedRoute.name}` 
              : 'System-wide performance analytics and insights'
            }
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-railway-blue focus:border-railway-blue"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button className="btn btn-primary">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="metric-label">System Uptime</p>
                <p className="metric-value">99.8%</p>
                <p className="text-xs text-green-600">+0.2% from last month</p>
              </div>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="metric-label">Data Points Collected</p>
                <p className="metric-value">2.4M</p>
                <p className="text-xs text-blue-600">+15% from last week</p>
              </div>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="metric-label">Defect Detection Rate</p>
                <p className="metric-value">94.2%</p>
                <p className="text-xs text-yellow-600">+2.1% accuracy</p>
              </div>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <Gauge className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="metric-label">Standards Compliance</p>
                <p className="metric-value">98.7%</p>
                <p className="text-xs text-purple-600">EN 13848 & RDSO</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defect Trends */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Defect Trends</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={defectTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area type="monotone" dataKey="critical" stackId="1" stroke="#DC2626" fill="#DC2626" fillOpacity={0.6} />
                <Area type="monotone" dataKey="high" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                <Area type="monotone" dataKey="medium" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                <Area type="monotone" dataKey="low" stackId="1" stroke="#84CC16" fill="#84CC16" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Defect Types Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Defect Types Distribution</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={defectTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {defectTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Track Geometry Parameters */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Track Geometry Parameters</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trackGeometryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="parameter" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="deviation" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {trackGeometryData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.parameter}</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Maintenance Schedule */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Maintenance Schedule</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={maintenanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="scheduled" fill="#3b82f6" name="Scheduled" />
                <Bar dataKey="completed" fill="#10b981" name="Completed" />
                <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Analysis */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Performance Analysis</h3>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
              <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line yAxisId="left" type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} name="Speed (km/h)" />
              <Line yAxisId="right" type="monotone" dataKey="vibration" stroke="#ef4444" strokeWidth={2} name="Vibration (m/s²)" />
              <Line yAxisId="right" type="monotone" dataKey="acceleration" stroke="#f59e0b" strokeWidth={2} name="Acceleration (g)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Predictive Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Predictive Maintenance</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <h4 className="font-medium text-yellow-800">Track Renewal Due</h4>
                  <p className="text-sm text-yellow-600">Chainage 245-250 km</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-yellow-800">30 days</p>
                  <p className="text-xs text-yellow-600">Estimated</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <h4 className="font-medium text-blue-800">Ballast Cleaning</h4>
                  <p className="text-sm text-blue-600">Chainage 180-185 km</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-800">45 days</p>
                  <p className="text-xs text-blue-600">Estimated</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <h4 className="font-medium text-green-800">Fastener Replacement</h4>
                  <p className="text-sm text-green-600">Chainage 320-325 km</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-800">60 days</p>
                  <p className="text-xs text-green-600">Estimated</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Cost Analysis</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Preventive Maintenance</span>
                <span className="text-sm font-medium text-green-600">₹2.4M</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Emergency Repairs</span>
                <span className="text-sm font-medium text-red-600">₹1.8M</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">System Operation</span>
                <span className="text-sm font-medium text-blue-600">₹0.6M</span>
              </div>
              <div className="border-t border-gray-200 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Total Cost</span>
                  <span className="text-sm font-medium text-gray-900">₹4.8M</span>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>Cost Savings:</strong> ₹3.2M compared to traditional monitoring methods
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
