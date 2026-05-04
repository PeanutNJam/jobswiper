# API Documentation

## Base URL

Local Docker development:

```text
http://localhost:8000/api
```

Nginx listens on host port `8000` and load-balances traffic to backend replicas on port `8080` inside the Docker network.

## Authentication

Protected endpoints require a Bearer token:

```http
Authorization: Bearer <jwt>
```

The frontend stores the JWT in AsyncStorage and attaches it through the Axios request interceptor in `frontend/src/services/api.ts`.

## Response Shape

Responses are JSON and are shaped per endpoint. Error responses generally use:

```json
{
  "error": "message"
}
```

Timestamps are returned as Unix milliseconds.

## Health

```http
GET /health
```

Response:

```json
{
  "service": "JobSwiper API",
  "status": "ok"
}
```

## Authentication Endpoints

### Register

```http
POST /auth/register
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "user_type": "job_seeker"
}
```

`user_type` must be `job_seeker` or `employer`.

Response `201`:

```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "user_type": "job_seeker",
    "created_at": 1714770000000,
    "updated_at": 1714770000000
  },
  "expiresIn": 604800
}
```

### Login

```http
POST /auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response `200`:

```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "user_type": "job_seeker",
    "created_at": 1714770000000,
    "updated_at": 1714770000000
  },
  "expiresIn": 604800
}
```

## Current User and Profile

### Get Current User

```http
GET /me
Authorization: Bearer <jwt>
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "user_type": "job_seeker",
    "created_at": 1714770000000,
    "updated_at": 1714770000000
  }
}
```

### Get Profile

```http
GET /profile
Authorization: Bearer <jwt>
```

Response:

```json
{
  "user_id": "uuid",
  "name": "Alex Johnson",
  "description": "5 years building mobile and web apps.",
  "photo_url": "https://...",
  "location": "San Francisco, CA",
  "skills": ["React Native", "TypeScript"],
  "updated_at": 1714770000000
}
```

### Update Profile

```http
PUT /profile
Authorization: Bearer <jwt>
Content-Type: application/json
```

Request:

```json
{
  "name": "Alex Johnson",
  "description": "Senior mobile engineer",
  "photo_url": "https://...",
  "location": "San Francisco, CA",
  "skills": ["React Native", "Go", "Cassandra"]
}
```

Response `200`: updated profile object.

## Discovery and Swipes

### Discover Profiles

```http
GET /discover
Authorization: Bearer <jwt>
```

For a job seeker, this returns employers. For an employer, this returns job seekers. Already-swiped users are filtered out.

Response:

```json
{
  "users": [
    {
      "user_id": "uuid",
      "username": "techcorp",
      "name": "TechCorp",
      "description": "Leading tech company...",
      "photo_url": "https://...",
      "location": "San Francisco, CA",
      "skills": []
    }
  ]
}
```

### Get Swipes

```http
GET /swipes
Authorization: Bearer <jwt>
```

Response:

```json
{
  "swipes": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "target_id": "uuid",
      "direction": "right",
      "created_at": 1714770000000
    }
  ]
}
```

### Create Swipe

```http
POST /swipe
Authorization: Bearer <jwt>
Content-Type: application/json
```

Request:

```json
{
  "target_id": "uuid",
  "direction": "right"
}
```

`direction` must be `right` or `left`.

Response `201`:

```json
{
  "swipe": {
    "id": "uuid",
    "user_id": "uuid",
    "target_id": "uuid",
    "direction": "right",
    "created_at": 1714770000000
  },
  "match": true
}
```

## Candidates

### Get Candidates

```http
GET /candidates
Authorization: Bearer <jwt>
```

Returns users who have swiped right on the current user/employer.

Response:

```json
{
  "candidates": [
    {
      "user_id": "uuid",
      "name": "Nina Patel",
      "description": "Data engineer who builds clean pipelines.",
      "photo_url": "https://...",
      "location": "Boston, MA"
    }
  ]
}
```

## Matches and Messages

### Get Matches

```http
GET /matches
Authorization: Bearer <jwt>
```

Response:

```json
{
  "matches": [
    {
      "match_id": "uuid",
      "other_user_id": "uuid",
      "other_user_name": "TechCorp",
      "other_user_photo": "https://...",
      "created_at": 1714770000000,
      "last_message": "Sounds great!",
      "last_message_at": 1714770200000
    }
  ]
}
```

### Delete Match

```http
DELETE /matches/:matchId
Authorization: Bearer <jwt>
```

Deletes the match row, both match-inbox read-model rows, all messages for the match, and the latest-message preview.

Response `204`: no body.

### Get Messages

```http
GET /matches/:matchId/messages
Authorization: Bearer <jwt>
```

Response:

```json
{
  "messages": [
    {
      "id": "uuid",
      "match_id": "uuid",
      "sender_id": "uuid",
      "content": "Hey, nice to meet you.",
      "created_at": 1714770000000
    }
  ]
}
```

### Send Message

```http
POST /matches/:matchId/messages
Authorization: Bearer <jwt>
Content-Type: application/json
```

Request:

```json
{
  "content": "Hey, nice to meet you."
}
```

Response `201`: created message object.

### Chat WebSocket

```http
GET /matches/:matchId/ws
Authorization: Bearer <jwt>
```

The backend upgrades the request to a WebSocket after verifying the current user belongs to the match. New messages sent through the REST endpoint are written to Cassandra, broadcast to local WebSocket clients, and published through Redis Pub/Sub so clients connected to other backend replicas also receive the message.

## Media and Device

### Get Upload URL

```http
GET /upload-url?filename=profile.jpg&content_type=image/jpeg
Authorization: Bearer <jwt>
```

Allowed content types: `image/jpeg`, `image/png`, `image/webp`.

Response:

```json
{
  "upload_url": "https://...",
  "public_url": "https://..."
}
```

### Save Device Token

```http
PUT /device-token
Authorization: Bearer <jwt>
Content-Type: application/json
```

Request:

```json
{
  "token": "expo_push_token"
}
```

Response:

```json
{
  "ok": true
}
```

## Common Errors

```json
{
  "error": "missing or invalid authorization header"
}
```

```json
{
  "error": "invalid or expired token"
}
```

```json
{
  "error": "not authorized"
}
```
