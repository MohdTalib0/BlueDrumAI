-- ============================================================================
-- 021: Add role column to users table for admin access control
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
