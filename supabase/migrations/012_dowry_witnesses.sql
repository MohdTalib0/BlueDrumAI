-- Dowry Vault - Witnesses Table
-- Phase 2: Women's Module

CREATE TABLE IF NOT EXISTS public.dowry_witnesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  relationship TEXT CHECK (relationship IN ('family', 'friend', 'neighbor', 'colleague', 'relative', 'other')),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dowry_witnesses_user_id ON public.dowry_witnesses(user_id);

ALTER TABLE public.dowry_witnesses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dowry_witnesses' AND policyname = 'dowry_witnesses_user_policy') THEN
    CREATE POLICY dowry_witnesses_user_policy ON public.dowry_witnesses FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TRIGGER update_dowry_witnesses_updated_at BEFORE UPDATE ON public.dowry_witnesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
