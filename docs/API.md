# API Documentation - Blue Drum AI

## Base URL

- Development: `http://localhost:3001`
- Production: `https://your-backend-url.onrender.com`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <clerk_jwt_token>
```

## Endpoints

### Health Checks

#### `GET /health`
Basic health check.

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### `GET /health/db`
Database health check.

**Response:**
```json
{
  "ok": true,
  "db": true
}
```

#### `GET /api/health/user`
Check if authenticated user exists in Supabase.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "ok": true,
  "exists_in_supabase": true,
  "user": { ... }
}
```

### Authentication

#### `POST /api/auth/sync-user`
Sync Clerk user to Supabase.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "ok": true,
  "user": { ... }
}
```

#### `GET /api/auth/me`
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "clerk_id": "user_...",
    "email": "user@example.com",
    "gender": "male",
    "relationship_status": "married",
    ...
  }
}
```

#### `PATCH /api/auth/me`
Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "gender": "male",
  "relationship_status": "married",
  "onboarding_completed": true
}
```

**Response:**
```json
{
  "ok": true,
  "user": { ... }
}
```

### Vault

#### `POST /api/vault/upload`
Upload file to vault.

**Headers:** `Authorization: Bearer <token>`

**Body:** `multipart/form-data`
- `file`: File to upload
- `type`: `photo | document | ticket | receipt | other`
- `module`: `male | female`
- `description`: Optional description

**Response:**
```json
{
  "ok": true,
  "entry": {
    "id": "uuid",
    "type": "photo",
    "file_url": "https://...",
    "file_hash": "sha256...",
    ...
  }
}
```

#### `GET /api/vault/entries`
Get all vault entries for user.

**Headers:** `Authorization: Bearer <token>`

**Query Params:**
- `type`: Filter by type (optional)
- `module`: Filter by module (optional)

**Response:**
```json
{
  "ok": true,
  "entries": [ ... ]
}
```

#### `GET /api/vault/entry/:id`
Get specific vault entry.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "ok": true,
  "entry": { ... }
}
```

#### `DELETE /api/vault/entry/:id`
Delete vault entry and file.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "ok": true,
  "message": "Entry deleted successfully"
}
```

### Waitlist

#### `POST /api/waitlist`
Join waitlist.

**Body:**
```json
{
  "email": "user@example.com",
  "interest": "male | female | both",
  "source": "landing_page",
  "meta": {}
}
```

**Response:**
```json
{
  "ok": true
}
```

### Risk Check

#### `POST /api/risk-check`
Generate AI-powered risk assessment.

**Body:**
```json
{
  "email": "user@example.com",
  "gender": "male | female",
  "answers": { ... },
  "manualInput": "Additional context..."
}
```

**Response:**
```json
{
  "ok": true,
  "riskScore": 75,
  "readinessScore": 60,
  "advice": "...",
  "legalContext": "..."
}
```

**Rate Limit:** 3 per email per 24 hours

## Error Responses

All errors follow this format:

```json
{
  "ok": false,
  "error": "Error message",
  "requestId": "uuid"
}
```

Status codes:
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

