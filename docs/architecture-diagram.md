# 🏗️ ITMS System Architecture

## 📊 High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React Dashboard] --> B[WebSocket Client]
        A --> C[API Client]
        A --> D[Map Component]
        A --> E[Camera Component]
        A --> F[Analytics Component]
    end
    
    subgraph "Backend Layer"
        G[Express API Server] --> H[WebSocket Server]
        G --> I[Authentication]
        G --> J[Rate Limiting]
        G --> K[Data Validation]
    end
    
    subgraph "Data Layer"
        L[PostgreSQL Database] --> M[PostGIS Extension]
        L --> N[Track Geometry Data]
        L --> O[Train Positions]
        L --> P[Defects & Alerts]
        L --> Q[Sensor Readings]
    end
    
    subgraph "Simulation Layer"
        R[Train Movement Simulator] --> S[Sensor Data Generator]
        R --> T[Defect Detection Simulator]
        R --> U[Alert Generator]
    end
    
    A --> G
    B --> H
    C --> G
    G --> L
    H --> L
    R --> L
    S --> L
    T --> L
    U --> L
```

## 🔄 Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant D as Database
    participant S as Simulation
    
    U->>F: Access Dashboard
    F->>B: GET /api/routes
    B->>D: Query routes
    D-->>B: Route data
    B-->>F: Route list
    F-->>U: Display routes
    
    F->>B: WebSocket connection
    B-->>F: Connection established
    
    S->>D: Generate train data
    S->>D: Generate sensor data
    S->>D: Generate defects
    
    D->>B: Real-time updates
    B->>F: WebSocket broadcast
    F->>U: Live updates
    
    U->>F: Select route
    F->>B: GET /api/routes/:id/live
    B->>D: Query live data
    D-->>B: Live data
    B-->>F: Live data
    F-->>U: Display live monitoring
```

## 🗄️ Database Schema Architecture

```mermaid
erDiagram
    ROUTES ||--o{ TRACK_GEOMETRY : contains
    ROUTES ||--o{ TRAIN_POSITIONS : tracks
    ROUTES ||--o{ DEFECTS : has
    ROUTES ||--o{ SENSOR_READINGS : monitors
    ROUTES ||--o{ MAINTENANCE_RECORDS : maintains
    ROUTES ||--o{ ALERTS : generates
    
    ROUTES {
        int id PK
        string name
        string start_station
        string end_station
        decimal distance_km
        int track_gauge_mm
        int max_speed_kmh
        timestamp created_at
    }
    
    TRACK_GEOMETRY {
        int id PK
        int route_id FK
        decimal chainage_km
        decimal latitude
        decimal longitude
        decimal gauge_mm
        decimal alignment_mm
        decimal twist_mm
        decimal cross_level_mm
        timestamp created_at
    }
    
    TRAIN_POSITIONS {
        int id PK
        int route_id FK
        string train_id
        decimal latitude
        decimal longitude
        decimal chainage_km
        decimal speed_kmh
        string direction
        timestamp timestamp
    }
    
    DEFECTS {
        int id PK
        int route_id FK
        decimal chainage_km
        string defect_type
        string severity
        text description
        decimal confidence_score
        int repair_priority
        decimal estimated_repair_cost
        timestamp detected_at
        string status
    }
    
    SENSOR_READINGS {
        int id PK
        int route_id FK
        decimal chainage_km
        decimal acceleration_x
        decimal acceleration_y
        decimal acceleration_z
        decimal vibration_level
        decimal temperature_celsius
        decimal humidity_percent
        timestamp timestamp
    }
    
    MAINTENANCE_RECORDS {
        int id PK
        int route_id FK
        decimal chainage_start_km
        decimal chainage_end_km
        string maintenance_type
        date scheduled_date
        date completed_date
        string status
        decimal cost
        text description
        string contractor
    }
    
    ALERTS {
        int id PK
        int route_id FK
        string alert_type
        string severity
        text message
        decimal chainage_km
        decimal latitude
        decimal longitude
        string status
        timestamp created_at
    }
```

## 🌐 Network Architecture

```mermaid
graph TB
    subgraph "Client Side"
        A[Web Browser] --> B[React App]
        B --> C[WebSocket Client]
        B --> D[HTTP Client]
    end
    
    subgraph "Load Balancer"
        E[Nginx/HAProxy]
    end
    
    subgraph "Application Servers"
        F[Backend Server 1]
        G[Backend Server 2]
        H[Backend Server N]
    end
    
    subgraph "Database Cluster"
        I[PostgreSQL Primary]
        J[PostgreSQL Replica 1]
        K[PostgreSQL Replica 2]
    end
    
    subgraph "External Services"
        L[OpenStreetMap Tiles]
        M[WebRTC Camera]
    end
    
    A --> E
    E --> F
    E --> G
    E --> H
    F --> I
    G --> I
    H --> I
    I --> J
    I --> K
    B --> L
    B --> M
```

## 🔄 Real-time Data Flow

```mermaid
graph LR
    subgraph "Data Sources"
        A[Train GPS] --> B[Simulation Engine]
        C[Track Sensors] --> B
        D[Camera Feed] --> B
    end
    
    subgraph "Processing Layer"
        B --> E[Data Validation]
        E --> F[AI Processing]
        F --> G[Alert Generation]
    end
    
    subgraph "Storage Layer"
        G --> H[PostgreSQL]
        H --> I[Real-time Cache]
    end
    
    subgraph "Distribution Layer"
        I --> J[WebSocket Server]
        J --> K[Frontend Clients]
        I --> L[REST API]
        L --> M[External Systems]
    end
    
    subgraph "Monitoring Layer"
        N[Health Checks] --> O[Logging]
        O --> P[Alerting]
        P --> Q[Dashboard]
    end
```

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        A[Docker Compose] --> B[Frontend Container]
        A --> C[Backend Container]
        A --> D[Database Container]
    end
    
    subgraph "Production Environment"
        E[Kubernetes Cluster] --> F[Frontend Pods]
        E --> G[Backend Pods]
        E --> H[Database Pods]
        E --> I[Redis Cache]
    end
    
    subgraph "Cloud Infrastructure"
        J[AWS/GCP/Azure] --> K[Load Balancer]
        K --> L[Auto Scaling Group]
        L --> M[Application Servers]
        J --> N[Managed Database]
        J --> O[Object Storage]
    end
    
    subgraph "Monitoring & Logging"
        P[Prometheus] --> Q[Grafana]
        R[ELK Stack] --> S[Log Analysis]
        T[AlertManager] --> U[Notifications]
    end
```

## 🔐 Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        A[HTTPS/TLS] --> B[Authentication]
        B --> C[Authorization]
        C --> D[Input Validation]
        D --> E[Rate Limiting]
        E --> F[Data Encryption]
    end
    
    subgraph "Network Security"
        G[Firewall] --> H[VPN Access]
        H --> I[Network Segmentation]
        I --> J[Intrusion Detection]
    end
    
    subgraph "Application Security"
        K[CORS Policy] --> L[CSRF Protection]
        L --> M[XSS Prevention]
        M --> N[SQL Injection Prevention]
    end
    
    subgraph "Data Security"
        O[Database Encryption] --> P[Backup Encryption]
        P --> Q[Audit Logging]
        Q --> R[Data Retention]
    end
```

## 📊 Performance Architecture

```mermaid
graph TB
    subgraph "Caching Layer"
        A[Browser Cache] --> B[CDN Cache]
        B --> C[Application Cache]
        C --> D[Database Cache]
    end
    
    subgraph "Optimization Layer"
        E[Query Optimization] --> F[Index Optimization]
        F --> G[Connection Pooling]
        G --> H[Load Balancing]
    end
    
    subgraph "Monitoring Layer"
        I[Performance Metrics] --> J[Resource Monitoring]
        J --> K[Error Tracking]
        K --> L[User Analytics]
    end
    
    subgraph "Scaling Layer"
        M[Horizontal Scaling] --> N[Vertical Scaling]
        N --> O[Auto Scaling]
        O --> P[Load Distribution]
    end
```

## 🎯 Component Architecture

```mermaid
graph TB
    subgraph "Frontend Components"
        A[Dashboard] --> B[Header]
        A --> C[Sidebar]
        A --> D[MapView]
        A --> E[CameraPanel]
        A --> F[AnalyticsPanel]
        A --> G[MonitoringPanels]
    end
    
    subgraph "Backend Services"
        H[API Routes] --> I[Authentication]
        H --> J[Data Validation]
        H --> K[Business Logic]
        K --> L[Database Layer]
    end
    
    subgraph "Real-time Services"
        M[WebSocket Server] --> N[Connection Manager]
        N --> O[Message Router]
        O --> P[Event Handler]
    end
    
    subgraph "Simulation Services"
        Q[Train Simulator] --> R[Sensor Simulator]
        R --> S[Defect Simulator]
        S --> T[Alert Simulator]
    end
```

---

**This architecture ensures scalability, reliability, and maintainability of the ITMS system while meeting all performance and security requirements.**
