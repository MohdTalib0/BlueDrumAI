-- Blue Drum AI - Audit Logs & Analytics
-- Phase 1.1: Production-grade data collection
-- Run this AFTER 001_initial_schema.sql

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
-- Track all data changes for compliance and debugging
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  clerk_id TEXT, -- Store clerk_id for reference even if user deleted
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'export'
  resource_type TEXT NOT NULL, -- 'user', 'vault_entry', 'income_tracker', etc.
  resource_id UUID, -- ID of the resource being acted upon
  changes JSONB, -- Before/after values for updates
  ip_address INET,
  user_agent TEXT,
  request_id TEXT, -- For correlating with API logs
  metadata JSONB, -- Additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_clerk_id ON public.audit_logs(clerk_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- ============================================
-- API REQUEST LOGS TABLE
-- ============================================
-- Track all API requests for analytics and debugging
CREATE TABLE IF NOT EXISTS public.api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  clerk_id TEXT,
  method TEXT NOT NULL, -- 'GET', 'POST', 'PUT', 'DELETE', etc.
  endpoint TEXT NOT NULL, -- '/api/vault/upload'
  status_code INT NOT NULL,
  response_time_ms INT, -- Response time in milliseconds
  ip_address INET,
  user_agent TEXT,
  request_id TEXT UNIQUE, -- Unique request ID for tracing
  request_size_bytes INT, -- Request body size
  response_size_bytes INT, -- Response body size
  error_message TEXT, -- If request failed
  metadata JSONB, -- Additional context (query params, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON public.api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_clerk_id ON public.api_logs(clerk_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON public.api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON public.api_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON public.api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_request_id ON public.api_logs(request_id);

-- ============================================
-- USER ACTIVITY LOGS TABLE
-- ============================================
-- Track user actions for analytics and security
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'login', 'logout', 'file_upload', 'file_download', 'export', etc.
  activity_details JSONB, -- Additional details about the activity
  ip_address INET,
  user_agent TEXT,
  device_info JSONB, -- Parsed device/browser info
  session_id TEXT, -- For grouping activities in a session
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON public.user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_session_id ON public.user_activities(session_id);

-- ============================================
-- USER SESSIONS TABLE
-- ============================================
-- Track user login sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  clerk_session_id TEXT, -- Clerk session ID
  ip_address INET,
  user_agent TEXT,
  device_info JSONB, -- Device type, OS, browser
  location_info JSONB, -- Country, city (from IP geolocation)
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_clerk_session ON public.user_sessions(clerk_session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active, last_activity_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON public.user_sessions(created_at DESC);

-- ============================================
-- USER PREFERENCES TABLE
-- ============================================
-- Store user preferences and settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  email_frequency TEXT CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'never')) DEFAULT 'daily',
  privacy_level TEXT CHECK (privacy_level IN ('standard', 'enhanced', 'maximum')) DEFAULT 'standard',
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  preferences JSONB, -- Additional preferences
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- ============================================
-- COMPLIANCE & DATA RETENTION
-- ============================================
-- Track GDPR compliance and data deletion requests
CREATE TABLE IF NOT EXISTS public.compliance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  clerk_id TEXT,
  request_type TEXT NOT NULL CHECK (request_type IN ('data_export', 'data_deletion', 'consent_update', 'privacy_policy_accept')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  request_details JSONB,
  response_data JSONB, -- Data exported or deletion confirmation
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_logs_user_id ON public.compliance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_status ON public.compliance_logs(status);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_created_at ON public.compliance_logs(created_at DESC);

-- ============================================
-- ENHANCE USERS TABLE
-- ============================================
-- Add production-grade fields to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS login_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS source TEXT, -- 'landing_page', 'referral', 'social', etc.
  ADD COLUMN IF NOT EXISTS referrer TEXT, -- Where they came from
  ADD COLUMN IF NOT EXISTS utm_source TEXT, -- UTM tracking
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB; -- Additional user metadata

CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_source ON public.users(source);

-- ============================================
-- RLS FOR NEW TABLES
-- ============================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATA RETENTION POLICY (Example)
-- ============================================
-- Note: Implement actual retention policy based on your requirements
-- Example: Delete API logs older than 90 days
-- CREATE POLICY "Auto-delete old API logs" ON public.api_logs
--   FOR DELETE USING (created_at < NOW() - INTERVAL '90 days');

