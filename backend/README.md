# Backend - JobSwiper API

Go + Gin REST API server for the JobSwiper job matching platform.

## Stack
- **Language**: Go 1.24+
- **Framework**: Gin
- **Database**: Apache Cassandra
- **Coordination**: Redis for atomic match creation and chat Pub/Sub
- **Storage**: S3-compatible profile image storage
- **Authentication**: JWT

## Project Structure

```
backend/
├── cmd/
│   └── main.go               # Entry point
├── internal/
│   ├── handlers/             # HTTP request handlers
│   ├── models/               # Data models
│   ├── services/             # Business logic
│   └── db/                   # Database layer (Cassandra)
├── pkg/
│   ├── auth/                 # JWT helpers
│   ├── config/               # Configuration management
│   ├── hub/                  # WebSocket hub and Redis chat fanout
│   ├── matchqueue/           # Redis mutual-swipe detection
│   ├── middleware/           # HTTP middleware
│   ├── push/                 # Push notification client
│   └── storage/              # S3/MinIO upload URLs
├── go.mod
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites
- Go 1.24+
- Cassandra 4.0+

### Setup

1. Install dependencies:
```bash
go mod download
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Edit `.env` with your configuration:
```
PORT=8080
ENVIRONMENT=development
CASSANDRA_HOST=localhost
CASSANDRA_PORT=9042
CASSANDRA_KEYSPACE=jobswiper
JWT_SECRET=your-secret-key-here
REDIS_ADDR=localhost:6379
S3_BUCKET=jobswiper-dev
AWS_ENDPOINT=http://localhost:9000
AWS_PUBLIC_ENDPOINT=http://localhost:9000
```

4. Start local services:
```bash
docker compose up -d cassandra redis minio
```

5. Run the load-balanced backend stack:
```bash
docker compose up -d --build --scale backend=3
```

The API is available through Nginx at `http://localhost:8000`.

## API Endpoints

### Health
- `GET /health` - Health check

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Swipes (Protected)
- `GET /api/swipes` - Get swiped profiles
- `POST /api/swipe` - Create new swipe

### Profile (Protected)
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

### Discovery, Candidates, and Jobs (Protected)
- `GET /api/discover` - Job seekers discover jobs; employers discover job seekers
- `GET /api/candidates` - Employers get candidates who swiped right on their jobs
- `POST /api/jobs` - Employers create a job with required skills
- `GET /api/jobs` - Employers get their jobs with swipe/match stats; job seekers get jobs
- `GET /api/jobs/:jobId` - Get a job
- `PUT /api/jobs/:jobId` - Update an employer-owned job
- `DELETE /api/jobs/:jobId` - Delete an employer-owned job

### Matches and Chat (Protected)
- `GET /api/matches` - Get match inbox
- `GET /api/matches/:matchId/profile` - Get the other user profile for an authorized match
- `GET /api/matches/:matchId/messages` - Get chat messages
- `POST /api/matches/:matchId/messages` - Send a message
- `GET /api/matches/:matchId/ws` - WebSocket room for real-time chat
- `DELETE /api/matches/:matchId` - Delete a match and messages

### Uploads and Notifications (Protected)
- `GET /api/upload-url` - Get a presigned profile-photo upload URL
- `PUT /api/device-token` - Save Expo push token

## Data Model Notes

- Cassandra tables are query-shaped. The backend writes canonical rows plus read models such as `users_by_email`, `users_by_type`, `swipes_by_target`, `matches_by_user`, `jobs_by_employer`, and `latest_messages_by_match`.
- Jobs use `skills` as required skills; salary is not part of the active job flow.
- Employer job stats are derived from swipes against job IDs and matches against the employer.
- Matched profile access is authorized by match membership.

## Development

### Hot reload
Install air:
```bash
go install github.com/cosmtrek/air@latest
```

Run with air:
```bash
air
```

### Testing
```bash
go test ./...
```

### Database Migrations
Migrations are managed in `internal/db/cassandra.go` and run automatically on startup.

## Deployment

### Docker
```bash
docker compose up -d --build --scale backend=3
```

### Cloud Deployment
See `docs/DEPLOYMENT.md` for AWS/GCP deployment instructions.
