# Backend - JobSwiper API

Go + Gin REST API server for the JobSwiper job matching platform.

## Stack
- **Language**: Go 1.21+
- **Framework**: Gin
- **Database**: Apache Cassandra
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
│   ├── config/               # Configuration management
│   └── middleware/           # HTTP middleware
├── go.mod
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites
- Go 1.21+
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
```

4. Start Cassandra (via Docker):
```bash
docker-compose up -d cassandra
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
