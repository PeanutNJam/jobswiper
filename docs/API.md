# API Documentation

## Base URL
Development: `http://localhost:8080/api`

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Response Format
All responses are JSON:
```json
{
  "status": "success|error",
  "data": {},
  "error": null
}
```

## Authentication Endpoints

### Register User
```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password",
  "user_type": "job_seeker" | "employer"
}

Response (201):
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "user_type": "job_seeker",
  "token": "jwt_token"
}
```

### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

Response (200):
{
  "token": "jwt_token",
  "expires_in": 3600
}
```

## Profile Endpoints (Protected)

### Get Profile
```
GET /profile
Authorization: Bearer <token>

Response (200):
{
  "user_id": "uuid",
  "name": "John Doe",
  "description": "Experienced developer",
  "photo_url": "https://...",
  "location": "San Francisco, CA",
  "user_type": "job_seeker"
}
```

### Update Profile
```
PUT /profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "description": "Senior developer",
  "location": "San Francisco, CA"
}

Response (200): Updated profile object
```

## Swipe Endpoints (Protected)

### Get Pending Swipes
```
GET /swipes
Authorization: Bearer <token>

Response (200):
{
  "swipes": [
    {
      "id": "uuid",
      "target_id": "uuid",
      "target_name": "Acme Corp",
      "target_type": "employer",
      "direction": "pending"
    }
  ]
}
```

### Create Swipe
```
POST /swipe
Authorization: Bearer <token>
Content-Type: application/json

{
  "target_id": "uuid",
  "direction": "right" | "left"
}

Response (201):
{
  "id": "uuid",
  "target_id": "uuid",
  "direction": "right",
  "created_at": "2024-01-01T00:00:00Z",
  "match": {
    "id": "uuid",
    "matched_at": "2024-01-01T00:00:00Z"
  }
}
```

## Match Endpoints (Protected)

### Get Matches
```
GET /matches
Authorization: Bearer <token>

Response (200):
{
  "matches": [
    {
      "id": "uuid",
      "user_id_1": "uuid",
      "user_id_2": "uuid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "status": "error",
  "error": "Invalid request format",
  "details": {}
}
```

### 401 Unauthorized
```json
{
  "status": "error",
  "error": "Invalid or missing token"
}
```

### 404 Not Found
```json
{
  "status": "error",
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "error": "Internal server error"
}
```
