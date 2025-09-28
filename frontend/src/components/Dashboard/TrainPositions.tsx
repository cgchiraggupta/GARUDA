import React from 'react';
import { Train, MapPin, Gauge, Clock } from 'lucide-react';
import { useData } from '../../contexts/DataContext.tsx';

const TrainPositions: React.FC = () => {
  const { trainPositions, loading } = useData();

  const getSpeedColor = (speed: number) => {
    if (speed > 120) return 'text-green-600';
    if (speed > 80) return 'text-yellow-600';
    if (speed > 0) return 'text-orange-600';
    return 'text-gray-500';
  };

  const getSpeedStatus = (speed: number) => {
    if (speed > 120) return 'High Speed';
    if (speed > 80) return 'Normal Speed';
    if (speed > 0) return 'Low Speed';
    return 'Stopped';
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (loading.trains) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
            <div className="skeleton-avatar"></div>
            <div className="flex-1 space-y-2">
              <div className="skeleton-text"></div>
              <div className="skeleton h-4 w-24"></div>
            </div>
            <div className="skeleton h-8 w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (trainPositions.length === 0) {
    return (
      <div className="text-center py-8">
        <Train className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No active trains found</p>
        <p className="text-sm text-gray-400">Train positions will appear here when available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trainPositions.slice(0, 5).map((train) => (
        <div key={train.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          {/* Train Icon */}
          <div className="flex-shrink-0">
            <div className="p-2 bg-railway-blue text-white rounded-lg">
              <Train className="h-5 w-5" />
            </div>
          </div>

          {/* Train Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                Train {train.train_number}
              </h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                {train.route_name}
              </span>
            </div>
            <div className="flex items-center space-x-4 mt-1">
              <div className="flex items-center text-xs text-gray-500">
                <MapPin className="h-3 w-3 mr-1" />
                {train.chainage_km.toFixed(1)} km
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(train.timestamp)}
              </div>
            </div>
          </div>

          {/* Speed */}
          <div className="flex-shrink-0 text-right">
            <div className={`text-lg font-semibold ${getSpeedColor(train.speed_kmh)}`}>
              {train.speed_kmh.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500">km/h</div>
            <div className="text-xs text-gray-400">{getSpeedStatus(train.speed_kmh)}</div>
          </div>
        </div>
      ))}

      {trainPositions.length > 5 && (
        <div className="text-center pt-4">
          <p className="text-sm text-gray-500">
            Showing 5 of {trainPositions.length} active trains
          </p>
        </div>
      )}
    </div>
  );
};

export default TrainPositions;
