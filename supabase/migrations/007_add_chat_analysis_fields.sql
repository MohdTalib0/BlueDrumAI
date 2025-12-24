-- Add recommendations and patterns_detected columns to chat_analyses table
-- These fields will store AI-generated recommendations and detected patterns

ALTER TABLE public.chat_analyses
ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS patterns_detected JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.chat_analyses.recommendations IS 'AI-generated recommendations based on chat analysis';
COMMENT ON COLUMN public.chat_analyses.patterns_detected IS 'Detected behavioral patterns with examples';

