-- Add 'openrouter' as a valid provider in ai_usage_logs
-- and expand service_type to include breakup_generator

ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_provider_check;

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_provider_check
    CHECK (provider IN ('anthropic', 'openai', 'openrouter'));

-- Also add breakup_generator service_type (missed from 011 migration)
ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_service_type_check;

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_service_type_check
    CHECK (service_type IN (
      'risk_check',
      'chat_analysis',
      'comparison',
      'red_flag_chat',
      'demo_red_flag',
      'breakup_generator',
      'other'
    ));
