# Architecture Documentation

## System Overview

JobSwiper is a three-tier job matching application with a mobile-first approach.

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Expo/React Native - iOS/Android)            │
│  - Swipe interface                                      │
│  - User authentication                                  │
│  - Profile management                                   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Backend API (Go + Gin)                                │
│  - RESTful endpoints                                    │
│  - User/Profile management                             │
│  - Matching algorithm                                   │
│  - WebSocket for real-time updates                     │
└──────────────────────┬──────────────────────────────────┘
                       │ TCP Port 9042
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Database (Apache Cassandra)                           │
│  - Distributed, highly available                        │
│  - Time-series optimized                               │
│  - Horizontally scalable                               │
└──────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend - Expo/React Native
- **Location**: `/frontend`
- **Language**: TypeScript
- **Build Target**: iOS (with Android support)
- **State Management**: Zustand for local state
- **Key Features**:
  - Swipe-based matching interface
  - OAuth integration (Apple Sign In, Google)
  - Image upload for profiles
  - Real-time match notifications

### Backend - Go API
- **Location**: `/backend`
- **Framework**: Gin (lightweight HTTP framework)
- **Database Driver**: GoCQL for Cassandra
- **Key Features**:
  - User authentication with JWT
  - RESTful API for all operations
  - Matching algorithm (to be implemented)
  - WebSocket support for real-time features
  - Rate limiting and request validation

### Database - Apache Cassandra
- **Location**: `/database`
- **Replication**: Single-node for dev, multi-node for production
- **Keyspace**: `jobswiper`
- **Key Features**:
  - High availability
  - Linear scalability
  - Suitable for time-series data
  - No single point of failure

## API Design

### RESTful Endpoints

```
Authentication
├── POST /api/auth/register
├── POST /api/auth/login
└── POST /api/auth/refresh

Profiles
├── GET  /api/profile
├── PUT  /api/profile
└── GET  /api/users/:id

Matches
├── GET  /api/matches
├── GET  /api/matches/:id
└── POST /api/matches/:id/message

Swipes
├── GET  /api/swipes
├── POST /api/swipe
└── GET  /api/swipe/pending
```

## Data Flow

### Swipe Flow
1. Frontend: User swipes (left/right)
2. Frontend: Send POST /api/swipe to backend
3. Backend: Record swipe in Cassandra
4. Backend: Check for mutual swipe (match)
5. Backend: If match, broadcast notification via WebSocket
6. Frontend: Receive notification, show match alert

### Authentication Flow
1. Frontend: User logs in
2. Backend: Verify credentials
3. Backend: Generate JWT token
4. Frontend: Store token in secure storage
5. Frontend: Include token in all API requests
6. Backend: Validate token via middleware

## Deployment Considerations

### Development
- Local Docker Cassandra
- Backend runs on localhost:8080
- Frontend runs via Expo CLI

### Production
- Backend: Deployed on AWS ECS/EKS or similar
- Database: Cassandra cluster (3+ nodes minimum)
- Frontend: Built and deployed to Apple App Store
- CDN: For static assets if needed

## Security

- JWT for API authentication
- HTTPS/TLS for all traffic
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting on endpoints
- CORS configuration for frontend

## Future Enhancements

- [ ] Real-time messaging system
- [ ] Advanced matching algorithm (ML-based)
- [ ] Payment integration
- [ ] Video profiles
- [ ] Social media integration
- [ ] Analytics dashboard
- [ ] Multi-language support
