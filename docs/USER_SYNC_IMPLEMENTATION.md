# User Sync Implementation

## Overview
This document describes the user synchronization system between Supabase Auth (`auth.users`) and the public `users` table.

## Migration: `010_add_user_profile_fields.sql`

Added the following columns to the `users` table:

- `first_name` (TEXT) - User's first name from Supabase Auth
- `last_name` (TEXT) - User's last name from Supabase Auth
- `login_count` (INTEGER) - Number of times user has logged in
- `email_verified` (BOOLEAN) - Whether user email is verified in Supabase Auth
- `source` (TEXT) - Registration source (web, mobile, api, etc.)
- `utm_source` (TEXT) - UTM source parameter from registration
- `utm_medium` (TEXT) - UTM medium parameter from registration
- `utm_campaign` (TEXT) - UTM campaign parameter from registration
- `referrer` (TEXT) - HTTP referrer from registration
- `metadata` (JSONB) - Additional user metadata

## Backend Sync Logic

### Helper Function: `syncUserFromAuth()`

Located in `backend/src/routes/auth.ts`, this function:
1. Fetches full user data from Supabase Auth using `auth.admin.getUserById()`
2. Extracts:
   - `first_name` and `last_name` from `user_metadata`
   - `email_verified` from `email_confirmed_at`
   - UTM parameters from query params, headers, or metadata
   - Referrer from HTTP headers
3. Merges metadata and preserves existing `login_count`
4. Upserts user data to `public.users` table

### API Endpoints

#### `POST /api/auth/sync-user`
- **Purpose**: Explicitly sync user data from Supabase Auth
- **Behavior**: Increments `login_count` by 1
- **Use Case**: Called after signup or when user data needs refresh

#### `GET /api/auth/me`
- **Purpose**: Get current user profile
- **Behavior**: Auto-syncs if user doesn't exist or `email_verified` is false
- **Use Case**: Called on every authenticated request to get user data

#### `PATCH /api/auth/me`
- **Purpose**: Update user profile (gender, relationship_status, onboarding_completed)
- **Behavior**: Auto-syncs user from auth if they don't exist
- **Use Case**: Called during onboarding or profile updates

## Frontend Integration

### Signup Flow
1. User signs up via `AuthContext.signUp()` with `firstName` and `lastName`
2. Supabase Auth stores these in `user_metadata`
3. Frontend should call `/api/auth/sync-user` after successful signup (if session exists)
4. Backend syncs all data to `public.users` table

### Sign-in Flow
1. User signs in via `AuthContext.signIn()`
2. Frontend can optionally call `/api/auth/sync-user` to update login count
3. Or rely on `GET /api/auth/me` which auto-syncs if needed

## Data Sources Priority

When syncing user data, the system uses the following priority:

1. **Supabase Auth** (`auth.users`):
   - `email` → `users.email`
   - `email_confirmed_at` → `users.email_verified`
   - `user_metadata.first_name` → `users.first_name`
   - `user_metadata.last_name` → `users.last_name`

2. **Request Headers**:
   - `x-source` → `users.source`
   - `x-utm-source` → `users.utm_source`
   - `x-utm-medium` → `users.utm_medium`
   - `x-utm-campaign` → `users.utm_campaign`
   - `referer`/`referrer` → `users.referrer`

3. **Query Parameters**:
   - `utm_source` → `users.utm_source`
   - `utm_medium` → `users.utm_medium`
   - `utm_campaign` → `users.utm_campaign`

4. **User Metadata** (fallback):
   - `user_metadata.source` → `users.source`
   - `user_metadata.utm_*` → `users.utm_*`
   - `user_metadata.referrer` → `users.referrer`

## Migration Steps

1. **Run the migration**:
   ```sql
   -- Run in Supabase SQL Editor
   -- File: supabase/migrations/010_add_user_profile_fields.sql
   ```

2. **Update existing users**:
   The migration includes a one-time sync that updates existing users:
   - Sets `email_verified` based on `auth.users.email_confirmed_at`
   - Extracts `first_name` and `last_name` from `raw_user_meta_data`

3. **Restart backend**:
   After migration, restart the backend server to use the new sync logic.

## Testing

### Test Signup Sync
1. Sign up a new user with first_name and last_name
2. Call `POST /api/auth/sync-user`
3. Verify `public.users` table has:
   - `first_name` and `last_name` populated
   - `email_verified` = false (until email is confirmed)
   - `login_count` = 1
   - `source` = 'web' (or from headers)

### Test Email Verification Sync
1. Verify email in Supabase Auth
2. Call `GET /api/auth/me`
3. Verify `email_verified` = true in `public.users`

### Test Login Count
1. Sign in multiple times
2. Call `POST /api/auth/sync-user` each time
3. Verify `login_count` increments correctly

## Notes

- The sync function preserves existing `login_count` unless `incrementLogin` is true
- Metadata is merged (not replaced) to preserve existing data
- UTM parameters can be passed via query params or headers
- The system gracefully handles missing data (uses null/defaults)

