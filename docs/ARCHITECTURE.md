# Architecture Documentation

## System Overview

JobSwiper is a three-tier mobile job matching application. Job seekers and employers discover each other through swipe flows, create mutual matches, and continue through in-app conversations.

```
┌─────────────────────────────────────────────────────────┐
│ Frontend: Expo / React Native / TypeScript              │
│ - Auth, persisted sessions, profile management          │
│ - Swipe UI for jobs/candidates                          │
│ - Match inbox and chat screens                          │
└──────────────────────┬──────────────────────────────────┘
                       │ REST + WebSocket
                       │
┌──────────────────────▼──────────────────────────────────┐
│ Load Balancer: Nginx                                    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│ Backend API Replicas: Go + Gin                          │
│ - JWT auth middleware                                   │
│ - REST endpoints for auth/profile/swipes/matches/chat   │
│ - WebSocket hub for live chat delivery                  │
│ - Push notifications for new matches                    │
└───────────────┬──────────────┬───────────────────────────┘
                │              │
                │              └── Redis: swipe coordination + chat Pub/Sub
                │
┌───────────────▼──────────────────────────────────────────┐
│ Cassandra                                                │
│ - Durable users, profiles, swipes, matches, messages     │
│ - Query-specific read models for production-style access │
└──────────────────────────────────────────────────────────┘
```

## Components

### Frontend
- **Location**: `/frontend`
- **Language**: TypeScript
- **Framework**: Expo / React Native
- **State**: Zustand plus AsyncStorage for persisted auth state
- **API Client**: Axios with a request interceptor that attaches `Authorization: Bearer <jwt>`

### Backend
- **Location**: `/backend`
- **Framework**: Gin
- **Database Driver**: GoCQL for Cassandra
- **Auth**: JWT signed with HMAC-SHA256
- **Realtime**: Gorilla WebSocket, in-process room fanout, and Redis Pub/Sub for cross-replica broadcasts
- **Storage**: S3-compatible upload URLs through MinIO locally
- **Push**: Expo push messages for match notifications

### Data Layer
- **Cassandra** is the source of truth.
- **Redis** is used as a coordination layer for right-swipe match detection and as the Pub/Sub bus that lets chat messages reach WebSocket clients connected to different backend replicas.
- **MinIO/S3** stores profile images.

## Cassandra Data Model

The backend uses Cassandra read models shaped around application queries:

- `users`: canonical user lookup by id.
- `users_by_email`: login lookup by normalized email.
- `users_by_type`: discovery feed by `job_seeker` or `employer`.
- `profiles`: one profile per user id.
- `jobs`: job postings by id.
- `swipes`: swipes made by a user, keyed by `(user_id, target_id)`.
- `swipes_by_target`: candidate list for an employer/target.
- `matches`: canonical match lookup by match id.
- `matches_by_user`: match inbox for each participant.
- `messages`: chat history partitioned by match id.
- `latest_messages_by_match`: conversation preview without reading full chat history.

Hot-path reads avoid `ALLOW FILTERING` and secondary-index lookups. Writes fan out into the canonical table plus the relevant read-model tables.

## API Design

```
Authentication
├── POST /api/auth/register
└── POST /api/auth/login

Current User
├── GET  /api/me
├── GET  /api/profile
└── PUT  /api/profile

Discovery and Swipes
├── GET  /api/discover
├── GET  /api/candidates
├── GET  /api/swipes
└── POST /api/swipe

Matches and Messages
├── GET    /api/matches
├── DELETE /api/matches/:matchId
├── GET    /api/matches/:matchId/messages
├── POST   /api/matches/:matchId/messages
└── GET    /api/matches/:matchId/ws

Media and Device
├── GET /api/upload-url
└── PUT /api/device-token
```

## Key Flows

### Authentication
1. User registers or logs in with email/password.
2. Backend normalizes email, validates credentials, and returns a JWT plus user object.
3. Frontend stores token and user locally.
4. Axios attaches the JWT on protected requests.
5. Backend middleware validates the token and sets `userID` in request context.
6. On app start, frontend restores the token and validates the session with `GET /api/me`.

### Swipe and Match
1. Frontend sends `POST /api/swipe`.
2. Backend writes the swipe to `swipes` and `swipes_by_target`.
3. For right swipes, Redis atomically records the pair in `swipe:right:{min}:{max}`.
4. When Redis sees both users in the set, exactly one request creates the match.
5. Backend writes `matches` and both users' `matches_by_user` rows.
6. Push notifications are sent asynchronously through `notifyMatch`.

### Messaging
1. Backend checks that the current user belongs to the match.
2. Messages are written to `messages`.
3. `latest_messages_by_match` is updated for inbox previews.
4. The local WebSocket hub immediately broadcasts the message to clients connected to the same backend replica.
5. The hub also publishes the message to Redis Pub/Sub.
6. Other backend replicas receive the Redis event and broadcast it to their own connected clients in that match room.

## Development Deployment

- `docker compose up -d --build --scale backend=3` starts Cassandra, Redis, MinIO, Nginx, and three backend replicas.
- Nginx maps host port `8000` to backend replicas on port `8080` inside the Docker network.
- Expo iOS simulator should use `http://localhost:8000`.
- A physical device should use the Mac's LAN IP with port `8000`.

## Production Considerations

- Use a multi-node Cassandra deployment or a managed Cassandra-compatible service.
- Replace development startup backfills with explicit migration/backfill jobs.
- Set `ENVIRONMENT=production`, `GIN_MODE=release`, and a real `JWT_SECRET`.
- Put the API behind HTTPS and a load balancer.
- Use durable object storage instead of local MinIO.
- Add rate limiting, structured logs, request IDs, and metrics before public launch.
