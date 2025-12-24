# Blue Drum AI

Evidence-based legal protection platform for Indian men and women navigating relationship disputes.

## 🎯 What We Do

Blue Drum AI provides a proactive "Digital Legal Shield" to help users:
- **Document evidence** with timestamps and metadata
- **Organize files** into lawyer-ready case files
- **Identify risks** through AI-powered analysis
- **Protect rights** with secure, encrypted storage

## 🚀 Quick Start

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Set up environment variables (see docs/SETUP.md)
cp backend/ENV.sample.txt backend/.env
# Edit backend/.env with your keys

# Run migrations in Supabase SQL Editor (see docs/SETUP.md)

# Start development servers
cd backend && npm run dev  # Terminal 1
npm run dev                 # Terminal 2
```

Visit `http://localhost:5173`

## 📚 Documentation

- [Setup Guide](./docs/SETUP.md) - Complete setup instructions
- [Clerk-Supabase Integration](./docs/CLERK_SUPABASE_INTEGRATION.md) - Authentication & Storage setup
- [Architecture](./docs/ARCHITECTURE.md) - System design and architecture
- [API Documentation](./docs/API.md) - Backend API reference
- [Database Schema](./docs/DATABASE.md) - Database structure
- [Migrations Guide](./docs/MIGRATIONS.md) - Database migration instructions
- [Repository Structure](./docs/STRUCTURE.md) - Project organization

## 🏗️ Project Structure

```
├── backend/          # Express + TypeScript API
├── src/             # React + TypeScript frontend
├── supabase/        # Database migrations
└── docs/            # Documentation
```

## ✨ Features

- ✅ **Authentication** - Clerk integration with sign up/in/reset
- ✅ **Consent Vault** - Secure file upload and organization
- ✅ **AI Analysis** - Risk assessment and legal context
- ✅ **Audit Logging** - Production-grade data collection
- ✅ **Analytics** - User behavior and feature usage tracking

## 🔒 Security

- JWT token validation
- Row Level Security (RLS)
- Input sanitization
- Rate limiting
- Audit trails
- Encrypted storage

## 📝 License

Private - All rights reserved
