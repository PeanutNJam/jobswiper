# Getting Started

## Prerequisites

### System Requirements
- macOS 12+ or Linux/Windows with Docker
- Git
- 4GB RAM minimum (8GB recommended)
- 5GB disk space

### Software
- **Frontend**: Node.js 18+, npm 9+
- **Backend**: Go 1.21+
- **Database**: Docker & Docker Compose

## Initial Setup

### 1. Clone the Repository
```bash
cd /Users/yx/Desktop/Coding/ppc-agent/job_swiper
```

### 2. Start the Database
```bash
# Start Cassandra using Docker Compose
docker-compose up -d cassandra

# Wait for Cassandra to be ready (check logs)
docker-compose logs -f cassandra

# Once you see "Listening on" messages, Cassandra is ready
# Press Ctrl+C to exit logs
```

### 3. Setup Backend

```bash
cd backend

# Download dependencies
go mod download

# Create .env file
cp .env.example .env

# Start the load-balanced backend stack
docker compose up -d --build --scale backend=3

# The API is available through Nginx at http://localhost:8000
```

In a new terminal window, verify the backend is running:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status":"ok","service":"JobSwiper API"}
```

### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the Expo development server
npm start

# This will open Expo Dev Tools
# Press 'i' to open iOS simulator or 's' for web
```

## Verification Checklist

- [ ] Docker Desktop is running
- [ ] `docker-compose logs cassandra` shows Cassandra is healthy
- [ ] `curl http://localhost:8000/health` returns status ok
- [ ] Frontend starts without errors
- [ ] Can see Expo app running in simulator

## Common Issues

### Cassandra fails to start
```bash
# Check if port 9042 is already in use
lsof -i :9042

# If in use, stop the container
docker-compose down

# Remove old container and try again
docker container prune
docker-compose up -d cassandra
```

### Backend connection errors
```bash
# Verify Cassandra is running
docker-compose ps

# If Cassandra isn't up, wait a bit longer and try again
docker-compose logs cassandra | tail -20
```

### Frontend won't start
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try again
npm start
```

## Next Steps

1. **Create a test user** via the frontend or API
2. **Explore the API** using tools like Postman or curl
3. **Implement core features**:
   - User authentication
   - Profile management
   - Swipe functionality
   - Match notifications

## Development Workflow

### Terminal 1: Database
```bash
docker-compose up cassandra
```

### Terminal 2: Backend
```bash
cd backend
docker compose up -d --build --scale backend=3
```

### Terminal 3: Frontend
```bash
cd frontend
npm start
```

This setup allows you to work on all three components simultaneously with hot reload where available.

## Useful Commands

### Database
```bash
# Connect to Cassandra CLI
docker-compose exec cassandra cqlsh

# Check cluster health
docker-compose exec cassandra nodetool status

# View logs
docker-compose logs -f cassandra
```

### Backend
```bash
# Run tests
go test ./...

# Build binary
go build -o bin/jobswiper cmd/main.go

# Format code
go fmt ./...

# Lint
go vet ./...
```

### Frontend
```bash
# Clear cache
npm cache clean --force

# Update dependencies
npm update

# Build for production
npm run build

# Run tests
npm test
```
