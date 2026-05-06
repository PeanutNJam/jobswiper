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
- Go 1.24+
- Docker & Docker Compose

### Setup Frontend

```bash
cd frontend
npm install
npm start
```

### Setup Database and Services

```bash
docker compose up -d cassandra redis minio
```

### Setup Backend

```bash
docker compose up -d --build --scale backend=3
```

The API is available at `http://localhost:8000` through the Nginx load balancer. Backend replicas listen on port `8080` inside the Docker network.

## Architecture Overview

### Frontend (Expo)
- Swipe interface for job discovery and candidate review
- Authentication & user profiles
- Employer job posting with required skills
- Employer job analytics for swipes, interested applicants, and matches
- Job-grouped conversation inbox for employers
- Profile popups from matches and conversations
- Push notification registration

### Backend (Go/Gin)
- RESTful API for matching algorithm
- User authentication & authorization
- Job & profile management
- Candidate/applicant aggregation by employer job
- Match profile access with per-match authorization
- WebSocket for real-time chat updates
- Redis-backed mutual-swipe coordination and chat fanout
- Nginx load balancer for multiple backend replicas

### Database (Cassandra)
- Distributed, horizontally scalable
- Query-shaped tables for login, discovery, employer jobs, candidates, match inboxes, and chat previews
- Time-clustered data for match and message history
- Optimized for high-throughput reads/writes

## Current Product Flow

- Job seekers discover jobs and swipe right to apply.
- Employers create jobs with required skills and review candidates who swiped right on those jobs.
- Employer job cards show total swipes, interested applicants, and match counts.
- Conversations are grouped by employer job post, then open into real-time chat.
- Users can open a matched person’s profile from the chat header or by tapping their avatar in the conversations list.

## Environment Configuration

See `.env.example` files in each component for configuration options.

## Contributing

[To be defined]

## License

[To be defined]
