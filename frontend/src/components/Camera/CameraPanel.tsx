import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Video, 
  Square, 
  Download, 
  MapPin, 
  Clock,
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react';
import { useData } from '../../contexts/DataContext.tsx';

interface CameraPanelProps {}

const CameraPanel: React.FC<CameraPanelProps> = () => {
  const { selectedRoute, trains } = useData();
  const webcamRef = useRef<Webcam>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number; chainage: number } | null>(null);
  const [crackDetections, setCrackDetections] = useState<Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>>([]);
  const lastCapturedIdRef = useRef<string | null>(null);
  // Post-processing to reduce gaps: dilate and merge nearby boxes
  type CrackDet = { id: string; x: number; y: number; width: number; height: number; confidence: number; severity: 'low' | 'medium' | 'high' | 'critical' };
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
          severity: last.severity,
        };
      } else {
        merged.push(d);
      }
    }

    return merged;
  }, [crackDetections]);

  // Simulate GPS coordinates based on current train position
  useEffect(() => {
    if (trains.length > 0 && selectedRoute) {
      const train = trains[0]; // Use first train for simulation
      setGpsCoordinates({
        lat: train.latitude,
        lng: train.longitude,
        chainage: train.chainage
      });
    }
  }, [trains, selectedRoute]);

  // Simulate crack detection
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every update
        const newDetection = {
          id: `crack-${Date.now()}`,
          x: Math.random() * 300 + 50,
          y: Math.random() * 200 + 50,
          width: Math.random() * 100 + 20,
          height: Math.random() * 20 + 5,
          confidence: 0.7 + Math.random() * 0.3,
          severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any
        };
        
        setCrackDetections(prev => [newDetection, ...prev.slice(0, 4)]);
        
        // Remove detection after 5 seconds
        setTimeout(() => {
          setCrackDetections(prev => prev.filter(d => d.id !== newDetection.id));
        }, 5000);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImages(prev => [imageSrc, ...prev.slice(0, 9)]);
    }
  }, [webcamRef]);

  // Persist captured image with metadata to localStorage
  const saveCaptureWithMetadata = useCallback((image: string, detection: { id: string; confidence: number; severity: 'low' | 'medium' | 'high' | 'critical' }) => {
    const payload = {
      image,
      timestamp: new Date().toISOString(),
      route: selectedRoute ? { id: selectedRoute.id, name: selectedRoute.name } : null,
      gps: gpsCoordinates ? { lat: gpsCoordinates.lat, lng: gpsCoordinates.lng, chainage: gpsCoordinates.chainage } : null,
      detection: {
        id: detection.id,
        confidence: detection.confidence,
        severity: detection.severity,
      },
    };

    try {
      const key = 'itms_captures';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const next = [payload, ...existing].slice(0, 50);
      localStorage.setItem(key, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to persist capture:', e);
    }
  }, [gpsCoordinates, selectedRoute]);

  // Auto-capture when a new significant detection appears
  useEffect(() => {
    const d = crackDetections[0];
    if (!d) return;
    const significant = d.confidence >= 0.85 || d.severity === 'high' || d.severity === 'critical';
    if (!significant) return;
    if (lastCapturedIdRef.current === d.id) return;

    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImages(prev => [imageSrc, ...prev.slice(0, 9)]);
      saveCaptureWithMetadata(imageSrc, { id: d.id, confidence: d.confidence, severity: d.severity });
      lastCapturedIdRef.current = d.id;
    }
  }, [crackDetections, saveCaptureWithMetadata]);

  const downloadImage = (imageSrc: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `itms-capture-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}-${index}.jpg`;
    link.click();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#F59E0B';
      case 'low': return '#059669';
      default: return '#6B7280';
    }
  };

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user"
  };

  return (
    <div className="space-y-6">
      {/* Main Camera View */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Track Recording Camera</h3>
              <p className="text-sm text-gray-600">
                {selectedRoute ? `${selectedRoute.name} - Live Feed` : 'No route selected'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="status-indicator">
                <div className="status-online"></div>
                <span className="text-sm text-gray-600">Recording</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card-content p-0">
          <div className="relative">
            <Webcam
              ref={webcamRef}
              audio={false}
              width={640}
              height={480}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full h-auto"
            />
            
            {/* GPS Overlay */}
            {gpsCoordinates && (
              <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-lg backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">GPS Coordinates</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div>Lat: {gpsCoordinates.lat.toFixed(6)}</div>
                  <div>Lng: {gpsCoordinates.lng.toFixed(6)}</div>
                  <div>Chainage: {gpsCoordinates.chainage.toFixed(3)} km</div>
                </div>
              </div>
            )}

            {/* Timestamp Overlay */}
            <div className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Timestamp</span>
              </div>
              <div className="text-xs">
                {new Date().toLocaleString()}
              </div>
            </div>

            {/* Crack Detection Overlays */}
            {processedDetections.map((detection) => (
              <motion.div
                key={detection.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute border-2 border-dashed rounded"
                style={{
                  left: detection.x,
                  top: detection.y,
                  width: detection.width,
                  height: detection.height,
                  borderColor: getSeverityColor(detection.severity),
                }}
              >
                <div 
                  className="absolute -top-6 left-0 text-xs font-medium px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: getSeverityColor(detection.severity),
                    color: 'white'
                  }}
                >
                  {detection.severity.toUpperCase()} - {(detection.confidence * 100).toFixed(1)}%
                </div>
              </motion.div>
            ))}

            {/* Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white p-3 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <button
                  onClick={capture}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  title="Capture Image"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`p-2 rounded-lg transition-colors ${
                    isRecording 
                      ? 'bg-danger-500 hover:bg-danger-600' 
                      : 'bg-success-500 hover:bg-success-600'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Start Recording'}
                >
                  {isRecording ? <Square className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  title={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detection Alerts */}
      {crackDetections.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Recent Detections</h3>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              {processedDetections.map((detection) => (
                <motion.div
                  key={detection.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <AlertTriangle 
                    className="w-5 h-5" 
                    style={{ color: getSeverityColor(detection.severity) }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {detection.severity.toUpperCase()} Crack Detected
                      </span>
                      <span 
                        className="text-xs px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: getSeverityColor(detection.severity) }}
                      >
                        {(detection.confidence * 100).toFixed(1)}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Position: ({detection.x.toFixed(0)}, {detection.y.toFixed(0)}) - 
                      Size: {detection.width.toFixed(0)}×{detection.height.toFixed(0)}px
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date().toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Captured Images */}
      {capturedImages.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Captured Images</h3>
            <p className="text-sm text-gray-600">Recent track recordings</p>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {capturedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Capture ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <button
                      onClick={() => downloadImage(image, index)}
                      className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                      title="Download Image"
                    >
                      <Download className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-2 py-1 rounded">
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Camera Status */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Camera Status</h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">1080p</div>
              <div className="text-sm text-gray-600">Resolution</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600">30 FPS</div>
              <div className="text-sm text-gray-600">Frame Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary-600">GPS</div>
              <div className="text-sm text-gray-600">Location Sync</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-danger-600">AI</div>
              <div className="text-sm text-gray-600">Crack Detection</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraPanel;
