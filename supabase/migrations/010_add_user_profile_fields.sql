-- Migration: Add missing user profile fields
-- Adds: first_name, last_name, login_count, email_verified, source, utm_source, referrer, campaign, metadata
-- Syncs data from Supabase Auth user metadata

-- Add missing columns to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS source TEXT, -- e.g., 'web', 'mobile', 'api'
  ADD COLUMN IF NOT EXISTS utm_source TEXT, -- UTM tracking: source
  ADD COLUMN IF NOT EXISTS utm_medium TEXT, -- UTM tracking: medium
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT, -- UTM tracking: campaign
  ADD COLUMN IF NOT EXISTS referrer TEXT, -- HTTP referrer
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb; -- Additional metadata

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON public.users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_source ON public.users(source);
CREATE INDEX IF NOT EXISTS idx_users_utm_source ON public.users(utm_source);

-- Add comments
COMMENT ON COLUMN public.users.first_name IS 'User first name from Supabase Auth';
COMMENT ON COLUMN public.users.last_name IS 'User last name from Supabase Auth';
COMMENT ON COLUMN public.users.login_count IS 'Number of times user has logged in';
COMMENT ON COLUMN public.users.email_verified IS 'Whether user email is verified in Supabase Auth';
COMMENT ON COLUMN public.users.source IS 'Registration source (web, mobile, api, etc.)';
COMMENT ON COLUMN public.users.utm_source IS 'UTM source parameter from registration';
COMMENT ON COLUMN public.users.utm_medium IS 'UTM medium parameter from registration';
COMMENT ON COLUMN public.users.utm_campaign IS 'UTM campaign parameter from registration';
COMMENT ON COLUMN public.users.referrer IS 'HTTP referrer from registration';
COMMENT ON COLUMN public.users.metadata IS 'Additional user metadata (JSON)';

-- Function to sync user data from Supabase Auth
-- This will be called by the backend when syncing users
CREATE OR REPLACE FUNCTION sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Update users table when auth.users is updated
  -- Extract first_name and last_name from raw_user_meta_data
  UPDATE public.users
  SET
    first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', users.first_name),
    last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', users.last_name),
    email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, users.email_verified),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-sync on auth.users insert/update
-- Note: This requires Supabase Auth triggers to be enabled
-- If triggers don't work, backend will handle sync via /api/auth/sync-user

-- Update existing users to sync email_verified from auth.users
-- This is a one-time sync for existing users
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT id, email_confirmed_at, raw_user_meta_data
    FROM auth.users
  LOOP
    UPDATE public.users
    SET
      email_verified = (auth_user.email_confirmed_at IS NOT NULL),
      first_name = COALESCE(auth_user.raw_user_meta_data->>'first_name', first_name),
      last_name = COALESCE(auth_user.raw_user_meta_data->>'last_name', last_name),
      updated_at = NOW()
    WHERE id = auth_user.id;
  END LOOP;
END$$;

