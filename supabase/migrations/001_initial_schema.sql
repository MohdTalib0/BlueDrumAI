-- Blue Drum AI - Initial Database Schema
-- Phase 1: Foundation & MVP
-- Run this in Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
-- Linked to Clerk authentication via official Third-Party Auth integration
-- Storage RLS policies use Clerk JWT claims (auth.jwt()->>'sub')
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT NOT NULL UNIQUE, -- Clerk user ID (used in RLS policies via JWT 'sub' claim)
  email TEXT NOT NULL UNIQUE,
  gender TEXT CHECK (gender IN ('male', 'female', 'both')),
  relationship_status TEXT CHECK (relationship_status IN ('single', 'dating', 'live_in', 'married', 'separated', 'divorced')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON public.users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================
-- VAULT ENTRIES TABLE (Men's Module)
-- ============================================
-- Evidence storage for consent vault
CREATE TABLE IF NOT EXISTS public.vault_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('photo', 'document', 'ticket', 'receipt', 'other')),
  module TEXT NOT NULL DEFAULT 'male' CHECK (module IN ('male', 'female')),
  file_url TEXT NOT NULL, -- Supabase storage URL
  file_hash TEXT, -- SHA-256 hash for verification
  encrypted BOOLEAN DEFAULT FALSE,
  metadata JSONB, -- EXIF data, location, dates, etc.
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_entries_user_id ON public.vault_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_entries_created_at ON public.vault_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_entries_type ON public.vault_entries(type);

-- ============================================
-- CHAT ANALYSES TABLE
-- ============================================
-- Red Flag Radar - Chat analysis results
CREATE TABLE IF NOT EXISTS public.chat_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  chat_export_url TEXT, -- Supabase storage URL for chat file
  risk_score INT CHECK (risk_score >= 0 AND risk_score <= 100),
  red_flags JSONB, -- Array of detected red flags
  analysis_text TEXT, -- AI-generated analysis
  keywords_detected JSONB, -- Extracted keywords
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_analyses_user_id ON public.chat_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_analyses_created_at ON public.chat_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_analyses_risk_score ON public.chat_analyses(risk_score);

-- ============================================
-- INCOME TRACKER TABLE (Men's Module)
-- ============================================
-- Monthly income and expense tracking
CREATE TABLE IF NOT EXISTS public.income_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month_year DATE NOT NULL, -- First day of month
  gross_income DECIMAL(12, 2) NOT NULL,
  deductions JSONB, -- {income_tax: 50000, pf: 12000, ...}
  expenses JSONB, -- {emi: 30000, medical: 5000, parents: 10000, ...}
  disposable_income DECIMAL(12, 2), -- Calculated field
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_income_tracker_user_id ON public.income_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_income_tracker_month_year ON public.income_tracker(month_year DESC);

-- ============================================
-- DV INCIDENTS TABLE (Women's Module)
-- ============================================
-- Domestic violence incident log
CREATE TABLE IF NOT EXISTS public.dv_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  incident_date TIMESTAMPTZ NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('physical', 'emotional', 'financial', 'sexual', 'threat', 'other')),
  description TEXT NOT NULL,
  location TEXT,
  evidence_urls TEXT[], -- Array of Supabase storage URLs
  medical_report_url TEXT, -- Medical report if available
  police_complaint_url TEXT, -- Police complaint if filed
  witnesses JSONB, -- Array of witness contacts
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dv_incidents_user_id ON public.dv_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_dv_incidents_incident_date ON public.dv_incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_dv_incidents_type ON public.dv_incidents(incident_type);

-- ============================================
-- DOWRY ENTRIES TABLE (Women's Module)
-- ============================================
-- Dowry gift and transfer documentation
CREATE TABLE IF NOT EXISTS public.dowry_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  value DECIMAL(12, 2),
  gift_date DATE,
  transfer_type TEXT CHECK (transfer_type IN ('cash', 'bank_transfer', 'jewelry', 'appliances', 'vehicle', 'property', 'other')),
  evidence_urls TEXT[], -- Photos, receipts, transfer proofs
  demand_recordings_url TEXT[], -- Audio/video of demands
  witnesses JSONB, -- Array of witness contacts
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dowry_entries_user_id ON public.dowry_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_dowry_entries_gift_date ON public.dowry_entries(gift_date DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dv_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dowry_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies are defined in 002_rls_policies.sql
-- Note: These policies use auth.uid() which requires Supabase Auth.
-- Since we're using Clerk, backend uses service role (bypasses RLS).
-- Policies are defined for future integration with Supabase Auth.

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vault_entries_updated_at BEFORE UPDATE ON public.vault_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_income_tracker_updated_at BEFORE UPDATE ON public.income_tracker
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dv_incidents_updated_at BEFORE UPDATE ON public.dv_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dowry_entries_updated_at BEFORE UPDATE ON public.dowry_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

