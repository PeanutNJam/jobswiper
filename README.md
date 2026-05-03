# JobSwiper - Tinder for Job Matching

A full-stack application connecting job seekers with employers using a swipe-based matching system.

## Tech Stack

- **Frontend**: React Native + Expo (TypeScript) - iOS compatible
- **Backend**: Go with Gin framework
- **Database**: Apache Cassandra
- **Infrastructure**: Docker for local development and cloud deployment

## Project Structure

```
job_swiper/
├── frontend/          # Expo/React Native TypeScript app
├── backend/           # Go REST API with Gin
├── database/          # Cassandra configuration & migrations
├── docs/              # Architecture & API documentation
└── docker-compose.yml # Multi-container orchestration
```

## Quick Start

### Prerequisites
- Node.js 18+
- Go 1.21+
- Docker & Docker Compose

### Setup Frontend

```bash
cd frontend
npm install
npm start
```

### Setup Backend

```bash
cd backend
go mod download
go run cmd/main.go
```

### Setup Database

```bash
docker-compose up -d cassandra
# Wait for Cassandra to be ready (check logs)
# Then run migrations (to be implemented)
```

## Architecture Overview

### Frontend (Expo)
- Swipe interface for job matches
- Authentication & user profiles
- Real-time notifications
- Offline support with local caching

### Backend (Go/Gin)
- RESTful API for matching algorithm
- User authentication & authorization
- Job & profile management
- WebSocket for real-time updates

### Database (Cassandra)
- Distributed, horizontally scalable
- Time-series data for match history
- User sessions & notifications
- Optimized for high-throughput reads/writes

## Environment Configuration

See `.env.example` files in each component for configuration options.

## Contributing

[To be defined]

## License

[To be defined]
# jobswiper
