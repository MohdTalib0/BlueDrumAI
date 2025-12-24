# Contributing to Blue Drum AI

## Development Setup

1. Clone the repository
2. Install dependencies (frontend and backend)
3. Set up environment variables
4. Run database migrations
5. Start development servers

See [Setup Guide](./docs/SETUP.md) for detailed instructions.

## Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Use Prettier (if configured)
- **Linting**: Follow ESLint rules
- **Naming**: camelCase for variables, PascalCase for components

## Project Structure

```
├── backend/          # Express API
│   └── src/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       └── utils/
│
├── src/             # React frontend
│   ├── components/
│   ├── pages/
│   └── lib/
│
├── supabase/
│   └── migrations/  # Database migrations
│
└── docs/            # Documentation
```

## Git Workflow

1. Create feature branch from `main`
2. Make changes
3. Test locally
4. Commit with descriptive messages
5. Push and create PR

## Testing

- Test authentication flow end-to-end
- Test file uploads
- Verify database migrations
- Check API endpoints

## Deployment

See `render.yaml` for Render deployment configuration.

