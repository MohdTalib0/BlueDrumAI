-- Migration: Switch from Clerk-based IDs to Supabase Auth (auth.uid())
-- Applies to: users table, RLS policies, storage policies

-- 1) Drop storage policies that reference clerk_id
DROP POLICY IF EXISTS "Users can upload to own vault folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own vault files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own vault files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own chat exports folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own chat exports" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat exports" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own documents folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

-- 2) Drop table policies that reference clerk_id
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own vault entries" ON public.vault_entries;
DROP POLICY IF EXISTS "Users can insert own vault entries" ON public.vault_entries;
DROP POLICY IF EXISTS "Users can update own vault entries" ON public.vault_entries;
DROP POLICY IF EXISTS "Users can delete own vault entries" ON public.vault_entries;
DROP POLICY IF EXISTS "Users can view own chat analyses" ON public.chat_analyses;
DROP POLICY IF EXISTS "Users can insert own chat analyses" ON public.chat_analyses;
DROP POLICY IF EXISTS "Users can delete own chat analyses" ON public.chat_analyses;
DROP POLICY IF EXISTS "Users can view own income records" ON public.income_tracker;
DROP POLICY IF EXISTS "Users can insert own income records" ON public.income_tracker;
DROP POLICY IF EXISTS "Users can update own income records" ON public.income_tracker;
DROP POLICY IF EXISTS "Users can delete own income records" ON public.income_tracker;
DROP POLICY IF EXISTS "Users can view own DV incidents" ON public.dv_incidents;
DROP POLICY IF EXISTS "Users can insert own DV incidents" ON public.dv_incidents;
DROP POLICY IF EXISTS "Users can update own DV incidents" ON public.dv_incidents;
DROP POLICY IF EXISTS "Users can delete own DV incidents" ON public.dv_incidents;
DROP POLICY IF EXISTS "Users can view own dowry entries" ON public.dowry_entries;
DROP POLICY IF EXISTS "Users can insert own dowry entries" ON public.dowry_entries;
DROP POLICY IF EXISTS "Users can update own dowry entries" ON public.dowry_entries;
DROP POLICY IF EXISTS "Users can delete own dowry entries" ON public.dowry_entries;

-- 3) Update users table: remove clerk_id, rely on auth.uid() = users.id
ALTER TABLE public.users DROP COLUMN IF EXISTS clerk_id;
DROP INDEX IF EXISTS idx_users_clerk_id;

-- 3a) Update user_sessions: replace clerk_session_id with session_id if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_sessions' AND column_name = 'clerk_session_id'
  ) THEN
    ALTER TABLE public.user_sessions RENAME COLUMN clerk_session_id TO session_id;
  END IF;
END$$;

-- 3b) Ensure columns in user_sessions for supabase auth
ALTER TABLE public.user_sessions
  ALTER COLUMN session_id DROP NOT NULL;

-- 4) Recreate policies using auth.uid() directly
-- Users
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Vault entries
CREATE POLICY "Users can view own vault entries"
  ON public.vault_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own vault entries"
  ON public.vault_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vault entries"
  ON public.vault_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own vault entries"
  ON public.vault_entries FOR DELETE
  USING (user_id = auth.uid());

-- Chat analyses
CREATE POLICY "Users can view own chat analyses"
  ON public.chat_analyses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chat analyses"
  ON public.chat_analyses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own chat analyses"
  ON public.chat_analyses FOR DELETE
  USING (user_id = auth.uid());

-- Income tracker
CREATE POLICY "Users can view own income records"
  ON public.income_tracker FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own income records"
  ON public.income_tracker FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own income records"
  ON public.income_tracker FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own income records"
  ON public.income_tracker FOR DELETE
  USING (user_id = auth.uid());

-- DV incidents
CREATE POLICY "Users can view own DV incidents"
  ON public.dv_incidents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own DV incidents"
  ON public.dv_incidents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own DV incidents"
  ON public.dv_incidents FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own DV incidents"
  ON public.dv_incidents FOR DELETE
  USING (user_id = auth.uid());

-- Dowry entries
CREATE POLICY "Users can view own dowry entries"
  ON public.dowry_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own dowry entries"
  ON public.dowry_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own dowry entries"
  ON public.dowry_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own dowry entries"
  ON public.dowry_entries FOR DELETE
  USING (user_id = auth.uid());

-- 5) Storage policies using auth.uid() (folder named by user id)
CREATE POLICY "Users can upload to own vault folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vault-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own vault files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vault-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own vault files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vault-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- chat-exports
CREATE POLICY "Users can upload to own chat exports folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-exports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own chat exports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-exports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own chat exports"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-exports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- documents
CREATE POLICY "Users can upload to own documents folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

