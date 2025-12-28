-- Blue Drum AI - RLS Policies
-- Phase 1.1: Row Level Security Policies
-- Run this AFTER 001_initial_schema.sql

-- ============================================
-- RLS POLICIES FOR USERS TABLE
-- ============================================
-- Users can only read/update their own record
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid()::text = clerk_id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid()::text = clerk_id);

-- Note: INSERT is handled by backend service role (sync from Clerk)
-- Users cannot directly insert themselves

-- ============================================
-- RLS POLICIES FOR VAULT ENTRIES
-- ============================================
-- Users can only access their own vault entries
CREATE POLICY "Users can view own vault entries"
  ON public.vault_entries FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own vault entries"
  ON public.vault_entries FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own vault entries"
  ON public.vault_entries FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own vault entries"
  ON public.vault_entries FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

-- ============================================
-- RLS POLICIES FOR CHAT ANALYSES
-- ============================================
CREATE POLICY "Users can view own chat analyses"
  ON public.chat_analyses FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own chat analyses"
  ON public.chat_analyses FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own chat analyses"
  ON public.chat_analyses FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

-- ============================================
-- RLS POLICIES FOR INCOME TRACKER
-- ============================================
CREATE POLICY "Users can view own income records"
  ON public.income_tracker FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own income records"
  ON public.income_tracker FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own income records"
  ON public.income_tracker FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own income records"
  ON public.income_tracker FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

-- ============================================
-- RLS POLICIES FOR DV INCIDENTS
-- ============================================
CREATE POLICY "Users can view own DV incidents"
  ON public.dv_incidents FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own DV incidents"
  ON public.dv_incidents FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own DV incidents"
  ON public.dv_incidents FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own DV incidents"
  ON public.dv_incidents FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

-- ============================================
-- RLS POLICIES FOR DOWRY ENTRIES
-- ============================================
CREATE POLICY "Users can view own dowry entries"
  ON public.dowry_entries FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own dowry entries"
  ON public.dowry_entries FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own dowry entries"
  ON public.dowry_entries FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own dowry entries"
  ON public.dowry_entries FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

-- ============================================
-- NOTE: Clerk Integration
-- ============================================
-- These policies use auth.uid() which expects Supabase Auth.
-- Since we're using Clerk, these policies won't work directly.
-- 
-- Options:
-- 1. Use service role for all operations (current approach)
-- 2. Create a Supabase Auth user when Clerk user signs up (future enhancement)
-- 3. Use custom JWT claims from Clerk (advanced)
--
-- For now, backend uses service role which bypasses RLS.
-- RLS policies are defined for future when we integrate Supabase Auth or custom JWT.

