-- Blue Drum AI - Storage Buckets Setup
-- Phase 1.1: Create storage buckets and RLS policies
-- Run this AFTER 001_initial_schema.sql

-- ============================================
-- CREATE STORAGE BUCKETS
-- ============================================
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- This SQL script documents the required buckets and their RLS policies

-- Required buckets:
-- 1. vault-files (private) - Evidence files for consent vault
-- 2. chat-exports (private) - WhatsApp chat exports
-- 3. documents (private) - General documents and PDFs

-- ============================================
-- STORAGE BUCKET RLS POLICIES
-- ============================================
-- These policies will be applied after buckets are created

-- Policy for vault-files bucket
-- Users can only upload/download files in their own folder
-- Uses Clerk JWT claim 'sub' (user ID) via official Third-Party Auth integration
CREATE POLICY "Users can upload to own vault folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vault-files' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.users WHERE clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can view own vault files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vault-files' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.users WHERE clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can delete own vault files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vault-files' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.users WHERE clerk_id = (auth.jwt()->>'sub')
    )
  );

-- Policy for chat-exports bucket
CREATE POLICY "Users can upload to own chat exports folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-exports' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.users WHERE clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can view own chat exports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-exports' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.users WHERE clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can delete own chat exports"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-exports' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.users WHERE clerk_id = (auth.jwt()->>'sub')
    )
  );

-- Policy for documents bucket
CREATE POLICY "Users can upload to own documents folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.users WHERE clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can view own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.users WHERE clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.users WHERE clerk_id = (auth.jwt()->>'sub')
    )
  );

-- ============================================
-- IMPORTANT NOTES
-- ============================================
-- 1. Storage buckets must be created manually via Supabase Dashboard:
--    - Go to Storage > New Bucket
--    - Create: vault-files (private), chat-exports (private), documents (private)
--
-- 2. These RLS policies use Clerk JWT claims via official Third-Party Auth integration.
--    Clerk session tokens work directly with Supabase when configured properly.
--
-- 3. Setup required:
--    a) Configure Clerk for Supabase: https://clerk.com/docs/integrations/databases/supabase
--    b) Add Clerk as Third-Party Auth provider in Supabase Dashboard
--    c) Add 'role' claim to Clerk session tokens (value: 'authenticated')
--    d) Use Clerk session tokens with Supabase client (see src/lib/supabase.ts)
--
-- 4. Integration flow:
--    - User signs up in Clerk
--    - Frontend calls /api/auth/sync-user (creates entry in public.users)
--    - Frontend uses Clerk session token with Supabase client
--    - Storage RLS policies check Clerk JWT 'sub' claim (clerk_id)
--
-- 5. Storage access:
--    - Frontend uses Supabase client with Clerk tokens for direct storage access
--    - RLS policies automatically enforce user ownership via Clerk JWT claims
--    - Backend API still works (uses service role + validates Clerk auth)

