# Blue Drum AI Backend

Express + TypeScript API server for Blue Drum AI.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp ENV.sample.txt .env
# Edit .env with your keys

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## Environment Variables

See `ENV.sample.txt` for all required variables.

## API Endpoints

- `GET /health` - Health check
- `GET /health/db` - Database health check
- `GET /api/health/user` - User sync status
- `POST /api/waitlist` - Join waitlist
- `POST /api/risk-check` - AI risk assessment
- `POST /api/auth/sync-user` - Sync Clerk user
- `GET /api/auth/me` - Get user profile
- `PATCH /api/auth/me` - Update user profile
- `POST /api/vault/upload` - Upload file
- `GET /api/vault/entries` - Get vault entries
- `DELETE /api/vault/entry/:id` - Delete entry

See [API Documentation](../docs/API.md) for complete reference.

## Project Structure

```
backend/
├── src/
│   ├── middleware/    # Auth, logging, error handling
│   ├── routes/        # API route handlers
│   ├── services/      # Business logic (AI, storage, analytics)
│   ├── utils/         # Utilities (sanitization, metadata)
│   └── server.ts      # Express app entry point
├── dist/              # Compiled JavaScript (gitignored)
└── ENV.sample.txt     # Environment variable template
```


