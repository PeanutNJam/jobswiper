# JobSwiper Technical Documentation

## Overview

JobSwiper is a mobile-first job matching application inspired by dating apps like Tinder. It allows job seekers to swipe through job opportunities and employers to swipe through candidate profiles, creating mutual matches for potential job placements. The application features real-time notifications, in-app messaging, and profile management.

### Key Features
- **Swipe-based matching**: Intuitive left/right swipe interface for job matching
- **Dual user types**: Support for both job seekers and employers
- **Real-time notifications**: Push notifications for matches and messages
- **In-app messaging**: WebSocket-based chat between matched users
- **Profile management**: Comprehensive user profiles with photos and descriptions
- **Image uploads**: S3-compatible storage for profile pictures
- **Cross-platform**: iOS and Android support via React Native

## Architecture

JobSwiper follows a three-tier architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Expo/React Native - iOS/Android)            │
│  - Swipe interface                                      │
│  - User authentication                                  │
│  - Profile management                                   │
│  - Real-time messaging                                  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS/REST + WebSocket
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Backend API (Go + Gin)                                │
│  - RESTful endpoints                                    │
│  - JWT authentication                                   │
│  - WebSocket server                                     │
│  - Matching algorithm                                   │
│  - Push notifications                                   │
└──────────────────────┬──────────────────────────────────┘
                       │ TCP
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Data Layer                                             │
│  - Apache Cassandra (primary database)                  │
│  - Redis (caching & real-time features)                 │
│  - MinIO (object storage)                               │
└──────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### Frontend
- User interface and experience
- State management
- API communication
- Offline data persistence
- Push notification handling

#### Backend
- Business logic implementation
- Authentication and authorization
- Data validation and processing
- Real-time communication (WebSocket)
- Integration with external services

#### Data Layer
- Persistent data storage
- Caching for performance
- File storage for images
- Real-time data structures

## Frontend Tech Stack

### Core Framework
- **React Native 0.73.6**: Cross-platform mobile development
- **Expo SDK ~50.0.0**: Managed workflow for React Native
- **TypeScript 5.3.0**: Type-safe JavaScript development

### Key Dependencies
- **Navigation**: 
  - `@react-navigation/native` (6.1.6)
  - `@react-navigation/native-stack` (7.14.12)
  - `@react-navigation/bottom-tabs` (6.5.10)
- **State Management**: `zustand` (4.4.0) - Lightweight state management
- **HTTP Client**: `axios` (1.6.0) - Promise-based HTTP client
- **Storage**: `@react-native-async-storage/async-storage` (1.23.1) - Local data persistence
- **UI Components**:
  - `react-native-gesture-handler` (~2.14.0) - Gesture handling
  - `react-native-reanimated` (~3.6.0) - Animations
  - `react-native-safe-area-context` (4.8.2) - Safe area handling
  - `react-native-svg` (14.1.0) - SVG support
- **Icons**: `@hugeicons/react-native` (1.0.13) with `@hugeicons/core-free-icons` (4.1.1)
- **Device Features**:
  - `expo-device` (~5.9.3) - Device information
  - `expo-image-picker` (~14.7.1) - Image selection
  - `expo-notifications` (~0.27.7) - Push notifications
  - `expo-status-bar` (~1.11.1) - Status bar styling

### Development Tools
- **Testing**: Jest (29.7.0) with `@testing-library/react-native` (12.4.0)
- **Linting**: ESLint (8.48.0) with TypeScript support
- **Build**: Expo CLI for development and production builds

### Project Structure
```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── constants/      # App constants (colors, etc.)
│   ├── hooks/          # Custom React hooks
│   ├── mock/           # Mock data for development
│   ├── navigation/     # Navigation configuration
│   ├── screens/        # Screen components
│   ├── services/       # API and external service integrations
│   ├── store/          # Zustand state management
│   └── types/          # TypeScript type definitions
├── App.tsx             # Main app component
├── app.json            # Expo configuration
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## Backend Tech Stack

### Core Framework
- **Go 1.24**: High-performance compiled language
- **Gin 1.9.1**: Lightweight HTTP web framework

### Key Dependencies
- **Database**: `github.com/gocql/gocql` (1.6.0) - Cassandra driver
- **Authentication**: `github.com/golang-jwt/jwt/v5` (5.0.0) - JWT token handling
- **Configuration**: `github.com/joho/godotenv` (1.5.1) - Environment variable loading
- **UUID Generation**: `github.com/google/uuid` (1.4.0) - Unique identifier generation
- **Password Hashing**: `golang.org/x/crypto` (0.15.0) - Cryptographic functions
- **WebSocket**: `github.com/gorilla/websocket` (1.5.3) - Real-time communication
- **AWS SDK**: AWS SDK v2 for S3-compatible storage

### Project Structure
```
backend/
├── cmd/
│   └── main.go              # Application entry point
├── internal/
│   ├── db/                  # Database layer (Cassandra)
│   ├── handlers/            # HTTP request handlers
│   ├── models/              # Data models and structures
│   └── services/            # Business logic services
├── pkg/
│   ├── auth/                # Authentication utilities
│   ├── config/              # Configuration management
│   ├── hub/                 # WebSocket hub for real-time features
│   ├── matchqueue/          # Matching queue client (Redis)
│   ├── middleware/          # HTTP middleware
│   ├── push/                # Push notification service
│   └── storage/             # File storage (S3/MinIO)
├── go.mod                   # Go module definition
├── go.sum                   # Dependency checksums
└── Dockerfile               # Container build configuration
```

### Key Components

#### Authentication (`pkg/auth`)
- JWT token generation and validation
- Token expiry: 30 days
- HMAC-SHA256 signing

#### Database Layer (`internal/db`)
- Cassandra connection management
- Query execution and result handling
- Schema initialization

#### Handlers (`internal/handlers`)
- REST API endpoint implementations
- Request validation and response formatting
- Error handling

#### Real-time Features (`pkg/hub`)
- WebSocket connection management
- Message broadcasting
- Client registration/deregistration

## Database

### Primary Database: Apache Cassandra 4.1
- **Purpose**: Main data persistence
- **Keyspace**: `jobswiper`
- **Replication**: Single-node for development, multi-node for production
- **Data Model**: Designed for high write throughput and horizontal scalability

#### Schema Overview
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT,
    username TEXT,
    password_hash TEXT,
    user_type TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Profiles table
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY,
    name TEXT,
    description TEXT,
    photo_url TEXT,
    location TEXT,
    updated_at TIMESTAMP
);

-- Swipes table (partitioned by user_id)
CREATE TABLE swipes (
    user_id UUID,
    target_id UUID,
    id UUID,
    direction TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY (user_id, target_id)
);

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY,
    user_id_1 UUID,
    user_id_2 UUID,
    created_at TIMESTAMP
);

-- Messages table (partitioned by match_id)
CREATE TABLE messages (
    match_id UUID,
    created_at TIMESTAMP,
    sender_id UUID,
    content TEXT,
    PRIMARY KEY (match_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

### Caching: Redis 7-alpine
- **Purpose**: Session management, real-time features, caching
- **Persistence**: AOF (Append Only File) enabled
- **Use Cases**:
  - Matching queue management
  - Real-time data structures
  - Session storage

### Object Storage: MinIO
- **Purpose**: File storage for profile images
- **Compatibility**: S3 API compatible
- **Configuration**: Local development with public bucket policy

## Infrastructure

### Development Environment
- **Docker Compose**: Multi-container orchestration
- **Services**:
  - Cassandra (port 9042)
  - Redis (port 6379)
  - MinIO (ports 9000, 9001)
  - Backend (port 8080, optional containerized)

### Production Deployment
- **Containerization**: Docker for all services
- **Orchestration**: AWS ECS or Kubernetes
- **Load Balancing**: Application Load Balancer
- **CDN**: CloudFront for static assets
- **Monitoring**: CloudWatch or similar

### Networking
- **Internal Network**: `jobswiper-network` for service communication
- **Port Mapping**:
  - Frontend: N/A (Expo development server)
  - Backend: 8080
  - Cassandra: 9042 (CQL), 9160 (Thrift)
  - Redis: 6379
  - MinIO: 9000 (API), 9001 (Console)

## APIs

### REST API Design
- **Base URL**: `/api`
- **Authentication**: Bearer token in Authorization header
- **Content Type**: `application/json`
- **Response Format**: JSON with consistent structure

### Key Endpoints

#### Authentication
```
POST /api/auth/register  # User registration
POST /api/auth/login     # User login
```

#### Protected Endpoints (require JWT)
```
GET  /api/me                    # Get current user info
GET  /api/profile               # Get user profile
PUT  /api/profile               # Update user profile
GET  /api/swipes                # Get user's swipes
POST /api/swipe                 # Create a swipe
GET  /api/candidates            # Get potential matches
GET  /api/discover              # Discover new profiles
GET  /api/matches               # Get user's matches
DELETE /api/matches/:id         # Delete a match
GET  /api/matches/:id/messages  # Get match messages
POST /api/matches/:id/messages  # Send a message
GET  /api/upload-url            # Get S3 upload URL
PUT  /api/device-token          # Save device token for notifications
```

### WebSocket API
- **Endpoint**: `/api/matches/:id/ws`
- **Purpose**: Real-time messaging within matches
- **Protocol**: JSON messages over WebSocket

### API Response Format
```json
{
  "status": "success|error",
  "data": {},
  "error": null
}
```

## Security

### Authentication
- **JWT Tokens**: Stateless authentication with 30-day expiry
- **Password Hashing**: bcrypt with appropriate cost factor
- **Token Storage**: Secure local storage on mobile devices

### Authorization
- **Middleware**: Gin middleware for JWT validation
- **Route Protection**: Protected routes require valid JWT
- **User Context**: User ID extracted from JWT for authorization checks

### Data Protection
- **Input Validation**: Request validation using Go's validator
- **SQL Injection Prevention**: Prepared statements in Cassandra queries
- **XSS Protection**: Input sanitization and safe rendering
- **CORS**: Configured CORS middleware for cross-origin requests

### Infrastructure Security
- **Network Isolation**: Internal Docker networks
- **Secret Management**: Environment variables for sensitive data
- **HTTPS**: TLS termination at load balancer
- **Rate Limiting**: Implemented in middleware (planned)

## Performance Considerations

### Database Optimization
- **Cassandra Partitioning**: Optimized for swipe and match queries
- **Indexing**: Secondary indexes on frequently queried fields
- **Clustering**: Time-based clustering for messages and notifications

### Caching Strategy
- **Redis**: Used for real-time features and session management
- **In-memory Caching**: Application-level caching for frequently accessed data

### Mobile Performance
- **Lazy Loading**: Components and data loaded on demand
- **Image Optimization**: Efficient image loading and caching
- **Offline Support**: Local storage for offline functionality

### Scalability
- **Horizontal Scaling**: Cassandra's distributed nature
- **Load Balancing**: Multiple backend instances
- **CDN**: Static asset delivery optimization

## Development Setup

### Prerequisites
- **System**: macOS 12+, Linux, or Windows with Docker
- **Node.js**: 18+ with npm 9+
- **Go**: 1.21+
- **Docker**: Desktop with Docker Compose
- **Git**: Version control

### Quick Start
```bash
# Clone repository
git clone <repository-url>
cd job_swiper

# Start infrastructure
sh setup.sh

# Start backend
cd backend
go run cmd/main.go

# Start frontend (new terminal)
cd frontend
npm install
npm start
```

### Environment Configuration
- **Backend**: `.env` file with database connections, JWT secret, etc.
- **Frontend**: `.env` file with API base URL and timeouts

## Deployment

### Frontend Deployment
- **Platform**: iOS App Store and Google Play Store
- **Tool**: Expo Application Services (EAS)
- **Process**: Build → TestFlight/App Store submission

### Backend Deployment
- **Containerization**: Docker image build
- **Registry**: AWS ECR or Docker Hub
- **Orchestration**: AWS ECS with Fargate
- **CI/CD**: GitHub Actions or similar

### Infrastructure as Code
- **Docker Compose**: Development environment
- **Terraform/CloudFormation**: Production infrastructure
- **Configuration Management**: Environment-specific configs

## Monitoring and Logging

### Application Monitoring
- **Health Checks**: `/health` endpoint for service availability
- **Metrics**: Request counts, response times, error rates
- **Logging**: Structured logging with request IDs

### Database Monitoring
- **Cassandra**: Nodetool for cluster health
- **Redis**: Redis CLI for performance metrics
- **MinIO**: Health endpoints and usage statistics

### Mobile Monitoring
- **Crash Reporting**: Sentry or similar service
- **Analytics**: User behavior and performance metrics
- **Push Notification**: Delivery success rates

## Future Enhancements

### Planned Features
- **Advanced Matching Algorithm**: ML-based job-candidate matching
- **Video Profiles**: Video introductions for enhanced profiles
- **Premium Features**: Subscription-based advanced features
- **Admin Dashboard**: Web-based admin interface
- **Analytics**: User engagement and matching success metrics

### Technical Improvements
- **GraphQL API**: More flexible data fetching
- **Microservices**: Break down monolithic backend
- **Event Sourcing**: For audit trails and complex state management
- **AI/ML Integration**: Resume parsing and skill matching
- **Real-time Analytics**: Streaming data processing

### Scalability Enhancements
- **Global CDN**: For worldwide user base
- **Multi-region Deployment**: Geographic distribution
- **Database Sharding**: Horizontal scaling beyond Cassandra's capabilities
- **Caching Layers**: Multi-level caching strategy

This technical documentation provides a comprehensive overview of the JobSwiper application's architecture, technology stack, and implementation details. The system is designed for scalability, maintainability, and user experience excellence.