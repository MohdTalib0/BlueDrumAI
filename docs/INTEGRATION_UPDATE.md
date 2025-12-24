# Clerk-Supabase Integration Update

## What Changed

We've updated the project to use Clerk's **official Third-Party Auth integration** with Supabase instead of creating separate Supabase Auth users.

### Benefits

✅ **Simpler** - No duplicate user creation  
✅ **More secure** - Official integration, no JWT secret sharing  
✅ **Direct storage access** - Frontend can access storage with Clerk tokens  
✅ **RLS policies work** - Storage policies use Clerk JWT claims  

## Changes Made

### 1. Backend (`backend/src/routes/auth.ts`)
- ✅ Removed Supabase Auth user creation from `/sync-user` endpoint
- ✅ Simplified to only create entry in `public.users` table
- ✅ Removed `supabase_auth_id` references

### 2. Database Schema (`supabase/migrations/001_initial_schema.sql`)
- ✅ Removed `supabase_auth_id` column from `users` table
- ✅ Now only uses `clerk_id` (linked via Clerk JWT `sub` claim)

### 3. Storage Policies (`supabase/migrations/003_storage_setup.sql`)
- ✅ Updated all policies to use `auth.jwt()->>'sub'` (Clerk user ID)
- ✅ Changed from `supabase_auth_id = auth.uid()` to `clerk_id = (auth.jwt()->>'sub')`

### 4. Frontend (`src/lib/supabase.ts`)
- ✅ Created new Supabase client that uses Clerk session tokens
- ✅ Provides `useSupabaseClient()` hook for React components

### 5. Documentation
- ✅ Created `docs/CLERK_SUPABASE_INTEGRATION.md` with setup guide
- ✅ Updated `docs/SETUP.md` with integration steps
- ✅ Updated `docs/MIGRATIONS.md` with new approach

## What You Need to Do

### 1. Configure Clerk for Supabase (Required)

1. Visit: https://clerk.com/docs/integrations/databases/supabase
2. Follow the setup wizard to configure your Clerk instance
3. This will automatically configure Clerk tokens for Supabase

### 2. Add Clerk as Third-Party Auth Provider in Supabase

**Via Dashboard:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Click "Add Provider" → Select "Clerk"
3. Enter your Clerk domain (e.g., `your-app.clerk.accounts.dev`)

**Via CLI (local development):**
Add to `supabase/config.toml`:
```toml
[auth.third_party.clerk]
enabled = true
domain = "your-app.clerk.accounts.dev"
```

### 3. Configure Clerk Session Token Customization

In Clerk Dashboard → Sessions → Token Customization:

1. Add custom claim: `role`
2. Set value to: `authenticated`
3. This allows Supabase to recognize authenticated users

### 4. Update Environment Variables

**Frontend `.env`:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 5. Run Database Migration (if needed)

If your `users` table already has `supabase_auth_id` column, you can remove it:

```sql
-- Remove supabase_auth_id column (no longer needed)
ALTER TABLE public.users DROP COLUMN IF EXISTS supabase_auth_id;
```

### 6. Update Storage Policies

Run the updated `supabase/migrations/003_storage_setup.sql` to update policies to use Clerk JWT claims.

## Testing

1. Sign up a new user
2. Check that user is created in `public.users` table
3. Try uploading a file - RLS policies should work with Clerk tokens
4. Verify storage access works from frontend

## Migration Path

If you have existing users with `supabase_auth_id`:
- They'll continue to work (backend still uses service role)
- New users will use Clerk tokens directly
- You can optionally migrate existing users by removing the column

## References

- [Clerk-Supabase Integration Guide](./CLERK_SUPABASE_INTEGRATION.md)
- [Clerk Docs](https://clerk.com/docs/integrations/databases/supabase)
- [Supabase Third-Party Auth](https://supabase.com/docs/guides/auth/third-party-auth)

