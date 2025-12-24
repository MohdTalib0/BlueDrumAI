# Architecture - Blue Drum AI

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express + TypeScript + Node.js
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Clerk
- **AI**: OpenAI GPT-4 / Anthropic Claude

## System Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────┐
│  React Frontend  │
│  (Vite + React)  │
└──────┬───────────┘
       │
       ├──► Clerk Auth ──┐
       │                  │
       └──► Express API ──┼──► Supabase (PostgreSQL)
                          │
                          └──► Supabase Storage
                          │
                          └──► OpenAI/Claude API
```

## Data Flow

### Authentication Flow
1. User signs up/in via Clerk
2. Clerk creates session
3. Frontend gets JWT token
4. Backend validates token via Clerk middleware
5. User auto-synced to Supabase on first API call

### File Upload Flow
1. User selects file → Frontend
2. File sent to backend with auth token
3. Backend validates auth
4. File uploaded to Supabase Storage
5. Metadata saved to PostgreSQL
6. Audit log created

## Database Schema

See [Database Documentation](./DATABASE.md) for complete schema.

## API Routes

See [API Documentation](./API.md) for complete API reference.

## Security

- JWT token validation (Clerk)
- Row Level Security (RLS) in Supabase
- Input sanitization
- Rate limiting
- CORS protection
- Audit logging
- Error handling without info disclosure

## Monitoring & Analytics

- API request logging
- User activity tracking
- Audit trails
- Performance metrics
- Error tracking

