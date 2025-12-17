-- Blue Drum AI - Risk Checks table
-- Stores all AI-powered risk check interactions
-- Run this in Supabase SQL editor after waitlist table exists.

CREATE TABLE IF NOT EXISTS public.risk_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  answers JSONB NOT NULL, -- All Q&A responses
  manual_input TEXT, -- Free-form text input
  ai_response JSONB NOT NULL, -- Full AI-generated response
  risk_score INT CHECK (risk_score >= 0 AND risk_score <= 100),
  readiness_score INT CHECK (readiness_score >= 0 AND readiness_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_checks_email ON public.risk_checks(email);
CREATE INDEX IF NOT EXISTS idx_risk_checks_created_at ON public.risk_checks(created_at DESC);

-- Link waitlist to risk checks (optional)
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS risk_check_id UUID REFERENCES public.risk_checks(id);

-- Enable RLS (service role bypasses this)
ALTER TABLE public.risk_checks ENABLE ROW LEVEL SECURITY;

