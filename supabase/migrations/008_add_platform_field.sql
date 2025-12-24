-- Add platform field to chat_analyses table
-- This stores which platform the chat was imported from (WhatsApp, SMS, Email, etc.)

ALTER TABLE public.chat_analyses
ADD COLUMN IF NOT EXISTS platform TEXT;

COMMENT ON COLUMN public.chat_analyses.platform IS 'Platform source: whatsapp, sms_android, sms_ios, email, manual, unknown';

-- Add index for filtering by platform
CREATE INDEX IF NOT EXISTS idx_chat_analyses_platform ON public.chat_analyses(platform);

