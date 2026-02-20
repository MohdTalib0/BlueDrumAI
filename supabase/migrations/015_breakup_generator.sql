-- Breakup Generator tables (Men's Module)

CREATE TABLE IF NOT EXISTS public.breakup_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL CHECK (template_type IN (
    'separation', 'divorce_intent', 'no_contact', 'closure', 'mutual_separation'
  )),
  tone TEXT NOT NULL CHECK (tone IN ('formal', 'compassionate', 'firm', 'neutral')),
  relationship_type TEXT CHECK (relationship_type IN (
    'arranged_marriage', 'love_marriage', 'live_in', 'dating', 'other'
  )),
  relationship_duration TEXT,
  key_points TEXT,
  generated_message TEXT NOT NULL,
  legal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breakup_messages_user_id ON public.breakup_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_breakup_messages_created_at ON public.breakup_messages(created_at DESC);

ALTER TABLE public.breakup_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY breakup_messages_user_policy ON public.breakup_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_breakup_messages_updated_at
  BEFORE UPDATE ON public.breakup_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
