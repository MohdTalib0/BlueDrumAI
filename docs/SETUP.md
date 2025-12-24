# Setup Guide - Blue Drum AI

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Clerk account
- OpenAI API key (or Anthropic API key)

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd Project-AlimonyAI

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Database Setup (Supabase)

1. Create a new Supabase project
2. Run migrations in order (see [Migrations Guide](./MIGRATIONS.md)):
   - `supabase/migrations/000_legacy_tables.sql` (if needed)
   - `supabase/migrations/001_initial_schema.sql` (core tables)
   - `supabase/migrations/004_audit_logs.sql` (logging & analytics)
   - `supabase/migrations/002_rls_policies.sql` (optional, for future)
   - `supabase/migrations/003_storage_setup.sql` (optional, for future)
3. Create storage buckets manually:
   - `vault-files` (private)
   - `chat-exports` (private)
   - `documents` (private)

### 3. Authentication Setup (Clerk)

1. Create account at [clerk.com](https://clerk.com)
2. Get publishable key and secret key
3. Configure email/password authentication
4. Set up redirect URLs:
   - Development: `http://localhost:5173`
   - Production: Your production URL

### 4. Clerk + Supabase Integration (Required for Storage RLS)

**Important:** This enables Clerk session tokens to work directly with Supabase Storage RLS policies.

1. **Configure Clerk for Supabase:**
   - Visit [Clerk's Connect with Supabase page](https://clerk.com/docs/integrations/databases/supabase)
   - Follow the setup wizard

2. **Add Clerk as Third-Party Auth in Supabase:**
   - Go to Supabase Dashboard → Authentication → Providers
   - Add "Clerk" as a provider
   - Enter your Clerk domain (e.g., `your-app.clerk.accounts.dev`)

3. **Configure Clerk Session Tokens:**
   - In Clerk Dashboard → Sessions → Token Customization
   - Add claim: `role` with value: `authenticated`

See [Clerk-Supabase Integration Guide](./CLERK_SUPABASE_INTEGRATION.md) for detailed instructions.

### 5. Environment Variables

**Frontend (`.env` in root):**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend (`backend/.env`):**
```env
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

CLERK_SECRET_KEY=sk_test_...

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

ANTHROPIC_API_KEY1=sk-ant-...
ANTHROPIC_API_KEY2=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20240620
```

### 5. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Visit `http://localhost:5173`

## Verification

1. Sign up at `/sign-up`
2. Complete onboarding
3. Upload a file to vault
4. Check Supabase for data

## Troubleshooting

See [Setup Guide](./SETUP.md) for common issues and solutions.

