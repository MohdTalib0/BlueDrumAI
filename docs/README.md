# Blue Drum AI - Documentation

## Quick Links

- [Setup Guide](./SETUP.md) - Complete setup instructions
- [Architecture](./ARCHITECTURE.md) - System architecture and design
- [API Documentation](./API.md) - Backend API reference
- [Database Schema](./DATABASE.md) - Database structure and migrations

## Project Structure

```
Project-AlimonyAI/
├── backend/              # Express + TypeScript backend
│   ├── src/
│   │   ├── middleware/   # Auth, logging, error handling
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic (AI, storage, analytics)
│   │   └── utils/        # Utilities
│   └── dist/             # Compiled JavaScript (gitignored)
│
├── src/                  # React + TypeScript frontend
│   ├── components/       # Reusable components
│   ├── pages/            # Page components
│   └── lib/              # Library configurations
│
├── supabase/
│   └── migrations/       # Database migrations (run in order)
│
└── docs/                 # Documentation
```

## Key Features

- ✅ Authentication (Clerk)
- ✅ User Management (Supabase)
- ✅ Consent Vault (File upload & storage)
- ✅ Audit Logging & Analytics
- ✅ Production-grade data collection

## Environment Variables

See [Setup Guide](./SETUP.md) for complete environment variable configuration.

