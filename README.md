# JobSwiper - Tinder for Job Matching

A full-stack application connecting job seekers with employers using a swipe-based matching system.

## Tech Stack

- **Frontend**: React Native + Expo (TypeScript) - iOS compatible
- **Backend**: Go with Gin framework
- **Database**: Apache Cassandra with query-specific read models
- **Coordination**: Redis for atomic mutual-swipe detection and cross-replica chat Pub/Sub
- **Storage**: MinIO/S3-compatible profile image storage
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
docker compose up -d --build --scale backend=3
```

The API is available at `http://localhost:8000` through the Nginx load balancer. Backend replicas listen on port `8080` inside the Docker network.

### Setup Database and Services

```bash
docker compose up -d cassandra redis minio
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
- WebSocket for real-time chat updates
- Redis-backed mutual-swipe coordination and chat fanout
- Nginx load balancer for multiple backend replicas

### Database (Cassandra)
- Distributed, horizontally scalable
- Query-shaped tables for login, discovery, candidates, match inboxes, and chat previews
- Time-clustered data for match and message history
- Optimized for high-throughput reads/writes

## Environment Configuration

See `.env.example` files in each component for configuration options.

## Contributing

[To be defined]

## License

[To be defined]
# jobswiper
