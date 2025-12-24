# Clerk + Supabase Integration Guide

This project uses Clerk's official Third-Party Auth integration with Supabase. This allows Clerk session tokens to work directly with Supabase RLS policies and Storage.

## Setup Steps

### 1. Configure Clerk for Supabase Compatibility

1. Visit [Clerk's Connect with Supabase page](https://clerk.com/docs/integrations/databases/supabase)
2. Follow the setup wizard to configure your Clerk instance
3. This will automatically configure Clerk session tokens for Supabase compatibility

### 2. Add Third-Party Auth Integration in Supabase

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard → Authentication → Providers
2. Click "Add Provider" → Select "Clerk"
3. Enter your Clerk domain (e.g., `your-app.clerk.accounts.dev`)

**Option B: Via Supabase CLI (for local development)**
Add to `supabase/config.toml`:
```toml
[auth.third_party.clerk]
enabled = true
domain = "your-app.clerk.accounts.dev"
```

### 3. Configure Clerk Session Token Customization

In Clerk Dashboard → Sessions → Token Customization:

1. Add a custom claim: `role`
2. Set value to: `authenticated` (or your Postgres role name)
3. This allows Supabase to recognize authenticated users

### 4. Environment Variables

**Frontend (`.env`):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=http://localhost:3001
```

**Backend (`backend/.env`):**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
```

## How It Works

### Authentication Flow

1. User signs up/signs in via Clerk
2. Clerk creates a session with JWT token
3. Frontend calls `/api/auth/sync-user` to create entry in `public.users` table
4. Frontend uses Clerk session token with Supabase client
5. Supabase validates Clerk token and applies RLS policies

### Storage RLS Policies

Storage policies use Clerk JWT claims to identify users:

```sql
-- Example: Users can only access their own files
CREATE POLICY "Users can view own vault files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vault-files' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.users 
      WHERE clerk_id = (auth.jwt()->>'sub')
    )
  );
```

The `auth.jwt()->>'sub'` contains the Clerk user ID from the JWT token.

### Frontend Usage

```typescript
import { useSupabaseClient } from '@/lib/supabase'
import { useSession } from '@clerk/clerk-react'

function MyComponent() {
  const { session } = useSession()
  const supabase = useSupabaseClient()
  
  // Upload file - RLS policies automatically enforce ownership
  const { data, error } = await supabase.storage
    .from('vault-files')
    .upload(`${userId}/file.jpg`, file)
}
```

## Benefits

✅ **No duplicate user creation** - No need to create Supabase Auth users  
✅ **Direct storage access** - Frontend can access storage directly with Clerk tokens  
✅ **RLS policies work** - Storage policies automatically enforce user ownership  
✅ **Simpler architecture** - Single source of truth (Clerk) for authentication  
✅ **Better security** - No need to share JWT secrets between services  

## Troubleshooting

### RLS policies not working?

1. Verify Clerk is configured as Third-Party Auth provider in Supabase
2. Check that `role` claim is added to Clerk session tokens
3. Ensure frontend is using `useSupabaseClient()` hook (includes Clerk token)
4. Check Supabase logs for JWT validation errors

### Storage access denied?

1. Verify Clerk token is being sent: Check Network tab → Authorization header
2. Verify RLS policies are enabled on storage buckets
3. Check that `clerk_id` in `public.users` matches JWT `sub` claim
4. Ensure user exists in `public.users` table (call `/api/auth/sync-user`)

## References

- [Clerk + Supabase Integration Docs](https://clerk.com/docs/integrations/databases/supabase)
- [Supabase Third-Party Auth](https://supabase.com/docs/guides/auth/third-party-auth)
- [Clerk JWT Claims](https://clerk.com/docs/reference/backend-api/token)

