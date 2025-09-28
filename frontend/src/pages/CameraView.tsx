import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Webcam from 'react-webcam';
import { 
  Camera, 
  CameraOff, 
  MapPin, 
  Gauge, 
  Clock, 
  Play, 
  Pause, 
  Square,
  Download,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useData } from '../contexts/DataContext.tsx';

const CameraView: React.FC = () => {
  const { selectedRoute, trainPositions } = useData();
  const webcamRef = useRef<Webcam>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isDetecting, setIsDetecting] = useState(true);
  const [cameraSettings, setCameraSettings] = useState({
    width: 1280,
    height: 720,
    fps: 30
  });
  const [overlayData, setOverlayData] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    chainage: 245.5,
    speed: 120,
    direction: 'forward',
    timestamp: new Date().toISOString()
  });

  // Captured events with geotagging when cracks are detected
  type DetectionEvent = {
    id: string;
    timestamp: string;
    latitude: number;
    longitude: number;
    count: number;
    image: string; // base64 screenshot
  };
  const [detectionEvents, setDetectionEvents] = useState<DetectionEvent[]>([]);

  // Mock crack detection data
  const [crackDetections, setCrackDetections] = useState([
    { id: 1, x: 150, y: 200, width: 80, height: 20, confidence: 0.92, severity: 'high' },
    { id: 2, x: 300, y: 150, width: 60, height: 15, confidence: 0.87, severity: 'medium' },
    { id: 3, x: 500, y: 300, width: 40, height: 10, confidence: 0.78, severity: 'low' }
  ]);

  // Post-processing to reduce gaps: dilate and merge nearby boxes
  type CrackDet = { id: number; x: number; y: number; width: number; height: number; confidence: number; severity: 'low' | 'medium' | 'high' | 'critical' };

  const processedDetections: CrackDet[] = useMemo(() => {
    const PAD = 12; // dilation in pixels
    const GAP = 18; // max horizontal gap to merge contiguous boxes

    const dilated = crackDetections.map((d) => ({
      ...d,
      x: Math.max(0, d.x - PAD),
      y: Math.max(0, d.y - PAD),
      width: d.width + PAD * 2,
      height: d.height + PAD * 2,
    }));

    // Merge nearby horizontally-contiguous boxes with similar vertical position
    const sorted = [...dilated].sort((a, b) => a.x - b.x);
    const merged: CrackDet[] = [];
    for (const d of sorted) {
      const last = merged[merged.length - 1];
      const lastRight = last ? last.x + last.width : 0;
      const verticalOverlap = last && !(d.y > last.y + last.height || last.y > d.y + d.height);
      if (last && verticalOverlap && d.x - lastRight <= GAP) {
        const minX = Math.min(last.x, d.x);
        const minY = Math.min(last.y, d.y);
        const maxX = Math.max(last.x + last.width, d.x + d.width);
        const maxY = Math.max(last.y + last.height, d.y + d.height);
        merged[merged.length - 1] = {
          ...last,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          confidence: Math.max(last.confidence, d.confidence),
          severity: last.severity, // keep higher-level style consistent
        };
      } else {
        merged.push(d);
      }
    }

    return merged;
  }, [crackDetections]);

  const videoConstraints = {
    width: cameraSettings.width,
    height: cameraSettings.height,
    facingMode: "environment"
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // In a real application, this would save the image with metadata
      console.log('Screenshot captured:', imageSrc);
    }
  }, [webcamRef]);

  // Continuously update GPS using browser geolocation API
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setOverlayData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: new Date().toISOString(),
        }));
      },
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Auto-capture frames and geotag whenever cracks are detected
  useEffect(() => {
    let interval: number | undefined;
    if (isDetecting) {
      interval = window.setInterval(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc) return;
        // Use processedDetections as current detection result (placeholder for real model)
        const count = processedDetections.length;
        if (count > 0) {
          const evt: DetectionEvent = {
            id: `${Date.now()}`,
            timestamp: new Date().toISOString(),
            latitude: overlayData.latitude,
            longitude: overlayData.longitude,
            count,
            image: imageSrc,
          };
          setDetectionEvents((prev) => [evt, ...prev].slice(0, 50));
        }
      }, 1000); // capture every second without stopping camera
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isDetecting, processedDetections, overlayData.latitude, overlayData.longitude]);

  const startRecording = () => {
    setIsRecording(true);
    // In a real application, this would start video recording
    console.log('Recording started');
  };

  const stopRecording = () => {
    setIsRecording(false);
    // In a real application, this would stop video recording
    console.log('Recording stopped');
  };

  const toggleDetection = () => {
    setIsDetecting(!isDetecting);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-500 bg-red-500/20';
      case 'medium':
        return 'border-yellow-500 bg-yellow-500/20';
      case 'low':
        return 'border-green-500 bg-green-500/20';
      default:
        return 'border-gray-500 bg-gray-500/20';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'High Risk';
      case 'medium':
        return 'Medium Risk';
      case 'low':
        return 'Low Risk';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Track Recording Car</h1>
            <p className="text-sm text-gray-600">
              {selectedRoute 
                ? `Recording ${selectedRoute.name} - Chainage ${overlayData.chainage.toFixed(1)} km` 
                : 'Live track inspection and defect detection'
              }
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isDetecting ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">
                {isDetecting ? 'Detection Active' : 'Detection Paused'}
              </span>
            </div>
            <button
              onClick={toggleDetection}
              className={`btn ${isDetecting ? 'btn-secondary' : 'btn-primary'}`}
            >
              {isDetecting ? 'Pause Detection' : 'Start Detection'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Camera View */}
        <div className="flex-1 relative">
          <div className="relative w-full h-full bg-black">
            <Webcam
              ref={webcamRef}
              audio={false}
              width={cameraSettings.width}
              height={cameraSettings.height}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full h-full object-cover"
            />

            {/* GPS Overlay */}
            <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-lg backdrop-blur-sm">
              <div className="space-y-1 text-sm">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>{overlayData.latitude.toFixed(6)}, {overlayData.longitude.toFixed(6)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Gauge className="h-4 w-4" />
                  <span>Chainage: {overlayData.chainage.toFixed(1)} km</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Speed: {overlayData.speed} km/h</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs">Direction: {overlayData.direction}</span>
                </div>
              </div>
            </div>

            {/* Crack Detection Overlays (gap-filled / dilated) */}
            {isDetecting && processedDetections.map((detection) => (
              <div
                key={detection.id}
                className={`absolute border-2 ${getSeverityColor(detection.severity)}`}
                style={{
                  left: `${(detection.x / cameraSettings.width) * 100}%`,
                  top: `${(detection.y / cameraSettings.height) * 100}%`,
                  width: `${(detection.width / cameraSettings.width) * 100}%`,
                  height: `${(detection.height / cameraSettings.height) * 100}%`,
                }}
              >
                <div className="absolute -top-6 left-0 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  {getSeverityText(detection.severity)} ({Math.round(detection.confidence * 100)}%)
                </div>
              </div>
            ))}

            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">REC</span>
              </div>
            )}

            {/* Detection Status */}
            <div className="absolute bottom-4 left-4 bg-black/70 text-white p-3 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                {isDetecting ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                )}
                <span className="text-sm">
                  {isDetecting 
                    ? `${crackDetections.length} defects detected` 
                    : 'Detection paused'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Camera Controls */}
          <div className="absolute bottom-4 right-4 flex space-x-2">
            <button
              onClick={capture}
              className="p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
              title="Take Screenshot"
            >
              <Camera className="h-6 w-6 text-gray-700" />
            </button>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-full shadow-lg transition-colors ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-white/90 hover:bg-white text-gray-700'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? (
                <Square className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </button>
            <button
              className="p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
              title="Download Recording"
            >
              <Download className="h-6 w-6 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* Detection Results */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Detection Results</h3>
            <div className="space-y-3">
              {crackDetections.map((detection) => (
                <div
                  key={detection.id}
                  className={`p-3 rounded-lg border ${
                    detection.severity === 'high' ? 'border-red-200 bg-red-50' :
                    detection.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Crack #{detection.id}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      detection.severity === 'high' ? 'bg-red-100 text-red-800' :
                      detection.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {detection.severity}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <div>Confidence: {Math.round(detection.confidence * 100)}%</div>
                    <div>Position: ({detection.x}, {detection.y})</div>
                    <div>Size: {detection.width}×{detection.height}px</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-captured geotagged frames */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Captured Events (Geotagged)</h3>
            {detectionEvents.length === 0 ? (
              <p className="text-sm text-gray-600">No events captured yet.</p>
            ) : (
              <div className="space-y-3">
                {detectionEvents.map((evt) => (
                  <div key={evt.id} className="flex items-start space-x-3">
                    <img src={evt.image} alt="capture" className="w-20 h-14 object-cover rounded border" />
                    <div className="text-xs text-gray-700">
                      <div className="font-medium">{new Date(evt.timestamp).toLocaleTimeString()}</div>
                      <div>Detections: {evt.count}</div>
                      <div>Lat: {evt.latitude.toFixed(6)}</div>
                      <div>Lng: {evt.longitude.toFixed(6)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Camera Settings */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Camera Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution
                </label>
                <select
                  value={`${cameraSettings.width}x${cameraSettings.height}`}
                  onChange={(e) => {
                    const [width, height] = e.target.value.split('x').map(Number);
                    setCameraSettings(prev => ({ ...prev, width, height }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-railway-blue focus:border-railway-blue"
                >
                  <option value="1280x720">1280×720 (HD)</option>
                  <option value="1920x1080">1920×1080 (Full HD)</option>
                  <option value="2560x1440">2560×1440 (2K)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frame Rate
                </label>
                <select
                  value={cameraSettings.fps}
                  onChange={(e) => setCameraSettings(prev => ({ ...prev, fps: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-railway-blue focus:border-railway-blue"
                >
                  <option value={15}>15 FPS</option>
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="p-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-3">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Camera</span>
                <span className="text-sm font-medium text-green-600">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">GPS</span>
                <span className="text-sm font-medium text-green-600">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">AI Detection</span>
                <span className={`text-sm font-medium ${isDetecting ? 'text-green-600' : 'text-yellow-600'}`}>
                  {isDetecting ? 'Active' : 'Paused'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Recording</span>
                <span className={`text-sm font-medium ${isRecording ? 'text-red-600' : 'text-gray-600'}`}>
                  {isRecording ? 'Recording' : 'Stopped'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Storage</span>
                <span className="text-sm font-medium text-green-600">2.3GB / 64GB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraView;
