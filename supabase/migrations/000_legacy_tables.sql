-- Blue Drum AI - Legacy Tables
-- These tables were created before the main schema migration
-- Run these BEFORE 001_initial_schema.sql if starting fresh
-- Or run separately if adding to existing database

-- ============================================
-- WAITLIST TABLE
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  interest TEXT NOT NULL CHECK (interest IN ('male', 'female', 'both')),
  source TEXT NOT NULL DEFAULT 'landing_page',
  sources TEXT[], -- Array to track all sources chronologically
  last_source TEXT, -- Most recent source
  risk_check_id UUID, -- Link to latest risk check
  ip INET,
  user_agent TEXT,
  meta JSONB, -- Additional metadata (risk_check_ids array, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist(created_at DESC);

-- ============================================
-- RISK CHECKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.risk_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  answers JSONB NOT NULL, -- All Q&A responses
  manual_input TEXT, -- Free-form text input
  ai_response JSONB NOT NULL, -- Full AI-generated response
  risk_score INT CHECK (risk_score >= 0 AND risk_score <= 100),
  readiness_score INT CHECK (readiness_score >= 0 AND readiness_score <= 100),
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_checks_email ON public.risk_checks(email);
CREATE INDEX IF NOT EXISTS idx_risk_checks_created_at ON public.risk_checks(created_at DESC);

-- Link waitlist to risk checks (optional foreign key)
ALTER TABLE public.waitlist 
  ADD COLUMN IF NOT EXISTS risk_check_id UUID REFERENCES public.risk_checks(id);

-- Enable RLS (service role bypasses this)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_checks ENABLE ROW LEVEL SECURITY;

