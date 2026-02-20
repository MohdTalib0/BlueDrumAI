-- Expand allowed service_type values for ai_usage_logs

ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_service_type_check;

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_service_type_check
    CHECK (service_type IN ('risk_check', 'chat_analysis', 'comparison', 'red_flag_chat', 'demo_red_flag', 'other'));


