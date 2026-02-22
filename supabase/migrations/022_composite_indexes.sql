-- ============================================================================
-- 022: Add composite indexes for common query patterns
-- Every user-scoped query does WHERE user_id = X ORDER BY created_at DESC.
-- A composite index lets Postgres satisfy both the filter and sort in one
-- index scan instead of filtering then sorting.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vault_entries_user_created
  ON public.vault_entries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_analyses_user_created
  ON public.chat_analyses (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_income_tracker_user_created
  ON public.income_tracker (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dv_incidents_user_created
  ON public.dv_incidents (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dowry_entries_user_created
  ON public.dowry_entries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_breakup_messages_user_created
  ON public.breakup_messages (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_calculations_user_created
  ON public.maintenance_calculations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created
  ON public.ai_usage_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_user_created
  ON public.feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_created
  ON public.user_sessions (user_id, created_at DESC);
