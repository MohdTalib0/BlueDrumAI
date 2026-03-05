-- ============================================================================
-- 023: Admin monitoring — incidents, alerts, and request logging enhancements
-- ============================================================================

-- ============================================
-- ADMIN INCIDENTS TABLE
-- ============================================
-- Track platform incidents and affected users
CREATE TABLE IF NOT EXISTS public.admin_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'mitigating', 'resolved', 'closed')) DEFAULT 'open',
  affected_service TEXT, -- 'auth', 'vault', 'red_flag', 'income', 'ai', 'storage', 'all'
  affected_user_count INT DEFAULT 0,
  affected_user_ids UUID[] DEFAULT '{}',
  root_cause TEXT,
  resolution TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_incidents_status ON public.admin_incidents(status);
CREATE INDEX IF NOT EXISTS idx_admin_incidents_severity ON public.admin_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_admin_incidents_created_at ON public.admin_incidents(created_at DESC);

ALTER TABLE public.admin_incidents ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_admin_incidents_updated_at BEFORE UPDATE ON public.admin_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ADMIN ALERTS TABLE
-- ============================================
-- Threshold-based alert rules
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  metric TEXT NOT NULL, -- 'error_rate', 'ai_cost', 'response_time', 'signup_rate', 'active_users'
  condition TEXT NOT NULL CHECK (condition IN ('gt', 'lt', 'eq', 'gte', 'lte')),
  threshold NUMERIC NOT NULL,
  time_window_minutes INT DEFAULT 60,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INT DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_active ON public.admin_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_metric ON public.admin_alerts(metric);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_admin_alerts_updated_at BEFORE UPDATE ON public.admin_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ALERT HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.admin_alerts(id) ON DELETE CASCADE,
  metric_value NUMERIC NOT NULL,
  threshold NUMERIC NOT NULL,
  message TEXT,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON public.admin_alert_history(alert_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_created_at ON public.admin_alert_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_ack ON public.admin_alert_history(acknowledged);

ALTER TABLE public.admin_alert_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES FOR EXISTING api_logs (monitoring queries)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint_status ON public.api_logs(endpoint, status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_error ON public.api_logs(status_code) WHERE status_code >= 400;
