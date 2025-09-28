-- ITMS Database Schema
-- Indigenous Track Monitoring System

-- Create database if not exists
CREATE DATABASE itms_demo;

-- Connect to the database
\c itms_demo;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Routes table
CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_station VARCHAR(255) NOT NULL,
    end_station VARCHAR(255) NOT NULL,
    distance_km DECIMAL(10,2) NOT NULL,
    track_gauge_mm INTEGER DEFAULT 1676,
    max_speed_kmh INTEGER DEFAULT 160,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track geometry points
CREATE TABLE track_geometry (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id),
    chainage_km DECIMAL(10,3) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    gauge_mm DECIMAL(6,2) DEFAULT 1676.00,
    alignment_mm DECIMAL(8,2) DEFAULT 0.00,
    twist_mm DECIMAL(8,2) DEFAULT 0.00,
    cross_level_mm DECIMAL(8,2) DEFAULT 0.00,
    vertical_profile_mm DECIMAL(8,2) DEFAULT 0.00,
    horizontal_curvature_radius_m DECIMAL(10,2),
    vertical_curvature_radius_m DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Train positions
CREATE TABLE train_positions (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id),
    train_id VARCHAR(50) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    chainage_km DECIMAL(10,3) NOT NULL,
    speed_kmh DECIMAL(6,2) DEFAULT 0.00,
    direction VARCHAR(10) DEFAULT 'forward',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Defects table
CREATE TABLE defects (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id),
    chainage_km DECIMAL(10,3) NOT NULL,
    defect_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'repaired', 'monitoring')),
    confidence_score DECIMAL(5,2) DEFAULT 0.00,
    repair_priority INTEGER DEFAULT 1,
    estimated_repair_cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sensor readings
CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id),
    chainage_km DECIMAL(10,3) NOT NULL,
    acceleration_x DECIMAL(8,4) NOT NULL,
    acceleration_y DECIMAL(8,4) NOT NULL,
    acceleration_z DECIMAL(8,4) NOT NULL,
    vibration_level DECIMAL(8,4) NOT NULL,
    temperature_celsius DECIMAL(5,2),
    humidity_percent DECIMAL(5,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance records
CREATE TABLE maintenance_records (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id),
    chainage_start_km DECIMAL(10,3) NOT NULL,
    chainage_end_km DECIMAL(10,3) NOT NULL,
    maintenance_type VARCHAR(100) NOT NULL,
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    cost DECIMAL(10,2),
    description TEXT,
    contractor VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    message TEXT NOT NULL,
    chainage_km DECIMAL(10,3),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP
);

-- System configuration
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_track_geometry_route_chainage ON track_geometry(route_id, chainage_km);
CREATE INDEX idx_train_positions_route_timestamp ON train_positions(route_id, timestamp);
CREATE INDEX idx_defects_route_severity ON defects(route_id, severity);
CREATE INDEX idx_sensor_readings_route_timestamp ON sensor_readings(route_id, timestamp);
CREATE INDEX idx_alerts_route_status ON alerts(route_id, status);

-- Create views for common queries
CREATE VIEW active_defects AS
SELECT 
    d.*,
    r.name as route_name,
    r.start_station,
    r.end_station
FROM defects d
JOIN routes r ON d.route_id = r.id
WHERE d.status = 'active'
ORDER BY d.severity DESC, d.detected_at DESC;

CREATE VIEW live_trains AS
SELECT 
    tp.*,
    r.name as route_name,
    r.start_station,
    r.end_station
FROM train_positions tp
JOIN routes r ON tp.route_id = r.id
WHERE tp.timestamp > NOW() - INTERVAL '5 minutes'
ORDER BY tp.timestamp DESC;

CREATE VIEW maintenance_schedule AS
SELECT 
    mr.*,
    r.name as route_name,
    r.start_station,
    r.end_station
FROM maintenance_records mr
JOIN routes r ON mr.route_id = r.id
WHERE mr.status IN ('scheduled', 'in_progress')
ORDER BY mr.scheduled_date ASC;

-- Insert initial system configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
('simulation_speed', '1.0', 'Simulation speed multiplier'),
('update_interval_ms', '2000', 'Real-time update interval in milliseconds'),
('max_trains_per_route', '5', 'Maximum number of trains per route'),
('defect_detection_threshold', '0.8', 'AI confidence threshold for defect detection'),
('maintenance_alert_days', '30', 'Days before maintenance to send alerts');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_defects_updated_at BEFORE UPDATE ON defects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();