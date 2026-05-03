#!/bin/bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓ $1${NC}"; }
info() { echo -e "${YELLOW}▶ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo ""
echo -e "${GREEN}=============================="
echo -e " JobSwiper Setup"
echo -e "==============================${NC}"
echo ""

# ── Prerequisites ──────────────────────────────────────────────────────────────

info "Checking prerequisites..."

command -v go     &>/dev/null || err "Go is not installed.    Install from https://go.dev/dl/"
command -v node   &>/dev/null || err "Node.js is not installed. Install from https://nodejs.org"
command -v docker &>/dev/null || err "Docker is not installed.  Install from https://docs.docker.com/get-docker/"

docker info &>/dev/null 2>&1 || err "Docker daemon is not running. Start Docker Desktop first."

ok "Prerequisites OK"

# ── Infrastructure (Cassandra + Redis) ─────────────────────────────────────────

info "Starting Cassandra and Redis..."
docker compose up -d cassandra redis

# Wait for Redis (fast)
info "Waiting for Redis..."
for i in $(seq 1 20); do
    if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
        ok "Redis is ready"
        break
    fi
    [ "$i" -eq 20 ] && err "Redis did not become ready in time"
    sleep 2
done

# Wait for Cassandra (slow start)
info "Waiting for Cassandra (this can take ~60s on first run)..."
for i in $(seq 1 40); do
    if docker compose exec -T cassandra cqlsh -e "describe cluster" &>/dev/null 2>&1; then
        ok "Cassandra is ready"
        break
    fi
    [ "$i" -eq 40 ] && err "Cassandra did not become ready in time"
    echo "  waiting... ($i/40)"
    sleep 5
done

# ── Backend ────────────────────────────────────────────────────────────────────

info "Setting up backend..."
cd backend

go mod download
ok "Go dependencies downloaded"

if [ ! -f .env ]; then
    cp .env.example .env
    ok "Created backend/.env from .env.example"
    echo ""
    echo -e "  ${YELLOW}Action required:${NC} open backend/.env and set a real JWT_SECRET before starting."
    echo ""
else
    ok "backend/.env already exists"
fi

cd ..

# ── Frontend ───────────────────────────────────────────────────────────────────

info "Setting up frontend..."
cd frontend

npm install --legacy-peer-deps
ok "npm packages installed"

if [ ! -f .env ]; then
    cp .env.example .env
    ok "Created frontend/.env from .env.example"
else
    ok "frontend/.env already exists"
fi

cd ..

# ── Done ───────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}=============================="
echo -e " Setup complete!"
echo -e "==============================${NC}"
echo ""
echo "Start the backend:"
echo "  cd backend && go run cmd/main.go"
echo ""
echo "Start the frontend:"
echo "  cd frontend && npx expo start"
echo ""
echo "Infra logs:"
echo "  docker compose logs -f"
echo ""
echo "Stop infra:"
echo "  docker compose down"
echo ""
