-- Migration: Auto-create public.users row when a new auth.users row is inserted
-- Without this, signups create an auth user but no public.users row,
-- causing /auth/me to return 404 and the entire app to break.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    (NEW.email_confirmed_at IS NOT NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.users.email),
    first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
    email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, public.users.email_verified),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Also fire on UPDATE so email_verified / name changes sync automatically
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill: create public.users rows for any auth.users that don't have one yet
INSERT INTO public.users (id, email, first_name, last_name, email_verified)
SELECT
  au.id,
  COALESCE(au.email, ''),
  au.raw_user_meta_data->>'first_name',
  au.raw_user_meta_data->>'last_name',
  (au.email_confirmed_at IS NOT NULL)
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
