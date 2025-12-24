-- AI Usage Tracking Table
-- Tracks token usage, costs, and API calls for monitoring and billing

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('risk_check', 'chat_analysis', 'other')),
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai')),
  model TEXT NOT NULL,
  
  -- Token usage
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  
  -- Cost tracking (in USD)
  input_cost DECIMAL(10, 6) DEFAULT 0,
  output_cost DECIMAL(10, 6) DEFAULT 0,
  total_cost DECIMAL(10, 6) DEFAULT 0,
  
  -- Request metadata
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  response_time_ms INTEGER,
  
  -- Related resources
  resource_type TEXT, -- e.g., 'chat_analysis', 'risk_check'
  resource_id UUID, -- ID of the related resource
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_service_type ON public.ai_usage_logs(service_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider ON public.ai_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_resource ON public.ai_usage_logs(resource_type, resource_id);

-- RLS Policies
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage logs
CREATE POLICY "Users can view own AI usage logs"
  ON public.ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (for backend logging)
CREATE POLICY "Service role can insert AI usage logs"
  ON public.ai_usage_logs FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.ai_usage_logs IS 'Tracks AI API usage including tokens and costs for monitoring and billing';
COMMENT ON COLUMN public.ai_usage_logs.input_cost IS 'Cost for input tokens in USD';
COMMENT ON COLUMN public.ai_usage_logs.output_cost IS 'Cost for output tokens in USD';
COMMENT ON COLUMN public.ai_usage_logs.total_cost IS 'Total cost in USD';

