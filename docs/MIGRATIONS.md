# Database Migrations Guide

## Migration Order

Run these SQL scripts in Supabase SQL Editor **in this exact order**:

### 1. Legacy Tables (if needed)
**File:** `supabase/migrations/000_legacy_tables.sql`
- Creates `waitlist` and `risk_checks` tables
- Only needed if you're adding to an existing database
- Can skip if starting fresh (main schema includes these)

### 2. Core Schema
**File:** `supabase/migrations/001_initial_schema.sql`
- Creates all core tables:
  - `users` (linked to Clerk via `clerk_id`)
  - `vault_entries`
  - `chat_analyses`
  - `income_tracker`
  - `dv_incidents`
  - `dowry_entries`
- Sets up indexes and triggers

### 3. Audit Logs & Analytics
**File:** `supabase/migrations/004_audit_logs.sql`
- Creates logging tables:
  - `audit_logs`
  - `api_logs`
  - `user_activities`
  - `user_sessions`
  - `user_preferences`
  - `compliance_logs`
- Enhances `users` table with production fields

### 4. Storage Policies (Required for Storage RLS)
**File:** `supabase/migrations/003_storage_setup.sql`
- Sets up RLS policies for Supabase Storage buckets
- Uses Clerk JWT claims (`auth.jwt()->>'sub'`) via Third-Party Auth integration
- **Requires**: Clerk configured as Third-Party Auth provider in Supabase
- See [Clerk-Supabase Integration Guide](./CLERK_SUPABASE_INTEGRATION.md)

### 5. Row Level Security (Optional)
**File:** `supabase/migrations/002_rls_policies.sql`
- Sets up RLS policies for database tables
- Can use Clerk JWT claims for table-level security
- Currently backend uses service role (bypasses RLS)

## Storage Buckets

Create these buckets manually in Supabase Dashboard → Storage:

1. **vault-files** (private)
   - Stores user evidence files
   - Path: `{user_id}/{timestamp}-{filename}`

2. **chat-exports** (private)
   - Stores WhatsApp chat exports
   - Path: `{user_id}/{timestamp}-{filename}`

3. **documents** (private)
   - Stores general documents
   - Path: `{user_id}/{timestamp}-{filename}`

## Verification

After running migrations, verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'users', 'vault_entries', 'waitlist', 'risk_checks',
  'audit_logs', 'api_logs', 'user_activities'
)
ORDER BY table_name;
```

## Rollback

To rollback a migration, manually drop the tables:

```sql
-- Example: Drop audit logs tables
DROP TABLE IF EXISTS compliance_logs CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_activities CASCADE;
DROP TABLE IF EXISTS api_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
```

**⚠️ Warning:** Only rollback in development. Production data will be lost.

