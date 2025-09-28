import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Gauge, TrendingUp, AlertTriangle } from 'lucide-react';
import { useData } from '../../contexts/DataContext.tsx';

const TrackGeometryChart: React.FC = () => {
  const { selectedRoute, loading } = useData();

  // Mock data for demonstration - in real app, this would come from API
  const mockData = [
    { chainage: 0, gauge: 1676.2, alignment: 2.1, twist: 1.8, crossLevel: 3.2 },
    { chainage: 50, gauge: 1675.8, alignment: 3.4, twist: 2.1, crossLevel: 2.8 },
    { chainage: 100, gauge: 1676.5, alignment: 1.9, twist: 1.5, crossLevel: 3.5 },
    { chainage: 150, gauge: 1675.9, alignment: 4.2, twist: 2.8, crossLevel: 2.1 },
    { chainage: 200, gauge: 1676.1, alignment: 2.8, twist: 1.9, crossLevel: 3.8 },
    { chainage: 250, gauge: 1675.7, alignment: 3.1, twist: 2.3, crossLevel: 2.9 },
    { chainage: 300, gauge: 1676.3, alignment: 2.5, twist: 1.7, crossLevel: 3.1 },
    { chainage: 350, gauge: 1676.0, alignment: 3.8, twist: 2.5, crossLevel: 2.6 },
    { chainage: 400, gauge: 1675.6, alignment: 2.2, twist: 1.6, crossLevel: 3.4 },
    { chainage: 450, gauge: 1676.4, alignment: 3.6, twist: 2.2, crossLevel: 2.3 },
  ];

  const getGaugeStatus = (value: number) => {
    if (value < 1671 || value > 1681) return { status: 'Critical', color: 'text-red-600' };
    if (value < 1673 || value > 1679) return { status: 'Warning', color: 'text-yellow-600' };
    return { status: 'Normal', color: 'text-green-600' };
  };

  const getAlignmentStatus = (value: number) => {
    if (Math.abs(value) > 10) return { status: 'Critical', color: 'text-red-600' };
    if (Math.abs(value) > 5) return { status: 'Warning', color: 'text-yellow-600' };
    return { status: 'Normal', color: 'text-green-600' };
  };

  const getTwistStatus = (value: number) => {
    if (Math.abs(value) > 8) return { status: 'Critical', color: 'text-red-600' };
    if (Math.abs(value) > 4) return { status: 'Warning', color: 'text-yellow-600' };
    return { status: 'Normal', color: 'text-green-600' };
  };

  const latestData = mockData[mockData.length - 1];
  const gaugeStatus = getGaugeStatus(latestData.gauge);
  const alignmentStatus = getAlignmentStatus(latestData.alignment);
  const twistStatus = getTwistStatus(latestData.twist);

  if (loading.dashboard) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-64 w-full rounded"></div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 w-full rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="chainage" 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `${value}km`}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)}${name === 'gauge' ? 'mm' : 'mm'}`,
                name.charAt(0).toUpperCase() + name.slice(1)
              ]}
              labelFormatter={(value) => `Chainage: ${value}km`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="gauge" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              name="Gauge"
            />
            <Line 
              type="monotone" 
              dataKey="alignment" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
              name="Alignment"
            />
            <Line 
              type="monotone" 
              dataKey="twist" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              name="Twist"
            />
            <Line 
              type="monotone" 
              dataKey="crossLevel" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              name="Cross Level"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Gauge className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Track Gauge</h4>
              <p className="text-lg font-semibold text-gray-900">{latestData.gauge.toFixed(1)} mm</p>
              <p className={`text-sm font-medium ${gaugeStatus.color}`}>
                {gaugeStatus.status}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Alignment</h4>
              <p className="text-lg font-semibold text-gray-900">{Math.abs(latestData.alignment).toFixed(1)} mm</p>
              <p className={`text-sm font-medium ${alignmentStatus.color}`}>
                {alignmentStatus.status}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Twist</h4>
              <p className="text-lg font-semibold text-gray-900">{Math.abs(latestData.twist).toFixed(1)} mm</p>
              <p className={`text-sm font-medium ${twistStatus.color}`}>
                {twistStatus.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Standards Compliance */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Standards Compliance</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">EN 13848:</span>
            <span className="ml-2 font-medium text-green-600">Compliant</span>
          </div>
          <div>
            <span className="text-gray-600">RDSO TM/IM/448:</span>
            <span className="ml-2 font-medium text-green-600">Compliant</span>
          </div>
          <div>
            <span className="text-gray-600">Sampling:</span>
            <span className="ml-2 font-medium text-green-600">25cm</span>
          </div>
          <div>
            <span className="text-gray-600">Speed Range:</span>
            <span className="ml-2 font-medium text-green-600">0-200 km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackGeometryChart;
