import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  AlertTriangle, 
  CheckCircle,
  Clock,
  DollarSign,
  Activity
} from 'lucide-react';
import { useData } from '../../contexts/DataContext.tsx';
import { apiService } from '../../services/api.ts';

interface AnalyticsPanelProps {}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = () => {
  const { selectedRoute, defects, alerts } = useData();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [complianceData, setComplianceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedRoute) {
      loadAnalyticsData();
    }
  }, [selectedRoute]);

  const loadAnalyticsData = async () => {
    if (!selectedRoute) return;
    
    setLoading(true);
    try {
      const [dashboard, trends, compliance] = await Promise.all([
        apiService.getDashboardAnalytics({ route_id: selectedRoute.id }),
        apiService.getTrendAnalysis({ route_id: selectedRoute.id, metric: 'defects', days: 30 }),
        apiService.getComplianceReport({ route_id: selectedRoute.id })
      ]);

      setAnalyticsData(dashboard.data);
      setTrendData(trends.data);
      setComplianceData(compliance.data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Defect severity distribution
  const defectSeverityData = [
    { name: 'Critical', value: defects.filter(d => d.severity === 'critical').length, color: '#DC2626' },
    { name: 'High', value: defects.filter(d => d.severity === 'high').length, color: '#EA580C' },
    { name: 'Medium', value: defects.filter(d => d.severity === 'medium').length, color: '#F59E0B' },
    { name: 'Low', value: defects.filter(d => d.severity === 'low').length, color: '#059669' },
  ];

  // Alert type distribution
  const alertTypeData = [
    { name: 'Defect Detection', value: alerts.filter(a => a.alert_type === 'defect_detected').length },
    { name: 'Speed Restriction', value: alerts.filter(a => a.alert_type === 'speed_restriction').length },
    { name: 'Maintenance Due', value: alerts.filter(a => a.alert_type === 'maintenance_due').length },
    { name: 'Weather Alert', value: alerts.filter(a => a.alert_type === 'weather_alert').length },
  ];

  // Mock trend data for demonstration
  const mockTrendData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
    defects: Math.floor(Math.random() * 10) + 1,
    maintenance: Math.floor(Math.random() * 5),
    alerts: Math.floor(Math.random() * 8) + 1,
  }));

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    change: string;
    trend: 'up' | 'down' | 'neutral';
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, change, trend, icon, color }) => (
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
            <div className="flex items-center space-x-1 mt-1">
              {trend === 'up' && <TrendingUp className="w-4 h-4 text-success-500" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4 text-danger-500" />}
              {trend === 'neutral' && <Activity className="w-4 h-4 text-gray-500" />}
              <span className={`text-sm ${
                trend === 'up' ? 'text-success-600' : 
                trend === 'down' ? 'text-danger-600' : 
                'text-gray-600'
              }`}>
                {change}
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
            {icon}
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Defects"
            value={defects.length}
            change="+12% from last month"
            trend="up"
            icon={<AlertTriangle className="w-6 h-6 text-danger-600" />}
            color="text-danger-600"
          />
          <StatCard
            title="Compliance Rate"
            value="94.2%"
            change="+2.1% from last month"
            trend="up"
            icon={<CheckCircle className="w-6 h-6 text-success-600" />}
            color="text-success-600"
          />
          <StatCard
            title="Avg Response Time"
            value="2.3 hrs"
            change="-15% from last month"
            trend="down"
            icon={<Clock className="w-6 h-6 text-primary-600" />}
            color="text-primary-600"
          />
          <StatCard
            title="Maintenance Cost"
            value="₹2.4M"
            change="+8% from last month"
            trend="up"
            icon={<DollarSign className="w-6 h-6 text-secondary-600" />}
            color="text-secondary-600"
          />
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Defect Trends (30 Days)</h3>
          </div>
          <div className="card-content">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="defects" 
                  stroke="#DC2626" 
                  fill="#DC2626" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Alert Activity</h3>
          </div>
          <div className="card-content">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="alerts" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="maintenance" 
                  stroke="#059669" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Defect Severity Distribution</h3>
          </div>
          <div className="card-content">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={defectSeverityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {defectSeverityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Alert Types</h3>
          </div>
          <div className="card-content">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={alertTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#1E40AF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Compliance Report */}
      {complianceData && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">EN 13848 Compliance Report</h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {complianceData.standard_compliance?.map((standard: any, index: number) => (
                <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary-600">
                    {standard.compliance_percentage}%
                  </div>
                  <div className="text-sm text-gray-600">{standard.parameter}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {standard.compliant_points} / {standard.total_points} points
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Predictive Maintenance */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Predictive Maintenance Insights</h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-success-50 rounded-lg">
              <div className="text-3xl font-bold text-success-600 mb-2">7</div>
              <div className="text-sm text-gray-600">Days until next maintenance</div>
              <div className="text-xs text-gray-500 mt-1">Track renewal at 245.5 km</div>
            </div>
            <div className="text-center p-4 bg-secondary-50 rounded-lg">
              <div className="text-3xl font-bold text-secondary-600 mb-2">3</div>
              <div className="text-sm text-gray-600">High priority defects</div>
              <div className="text-xs text-gray-500 mt-1">Require immediate attention</div>
            </div>
            <div className="text-center p-4 bg-primary-50 rounded-lg">
              <div className="text-3xl font-bold text-primary-600 mb-2">₹1.2M</div>
              <div className="text-sm text-gray-600">Estimated repair cost</div>
              <div className="text-xs text-gray-500 mt-1">Next 30 days</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
