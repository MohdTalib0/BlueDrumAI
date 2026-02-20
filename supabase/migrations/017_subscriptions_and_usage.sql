-- ============================================================================
-- 017: Subscriptions, usage limits, and file_size tracking
-- ============================================================================

-- 1. Subscriptions table — one row per user
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'premium')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')),
  razorpay_subscription_id TEXT,
  razorpay_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_sub_id ON public.subscriptions(razorpay_subscription_id);

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscriptions_select_own' AND tablename = 'subscriptions') THEN
    CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscriptions_insert_own' AND tablename = 'subscriptions') THEN
    CREATE POLICY subscriptions_insert_own ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscriptions_update_own' AND tablename = 'subscriptions') THEN
    CREATE POLICY subscriptions_update_own ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role can do anything (for webhook handler)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscriptions_service_all' AND tablename = 'subscriptions') THEN
    CREATE POLICY subscriptions_service_all ON public.subscriptions FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;


-- 2. Usage limits table — tracks monthly counters per user
CREATE TABLE IF NOT EXISTS public.usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month_year DATE NOT NULL,  -- always first of month, e.g. '2026-02-01'
  ai_analyses_count INT NOT NULL DEFAULT 0,
  pdf_exports_count INT NOT NULL DEFAULT 0,
  vault_uploads_count INT NOT NULL DEFAULT 0,
  breakup_count INT NOT NULL DEFAULT 0,
  red_flag_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usage_limits_user_month_unique UNIQUE (user_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_usage_limits_user_month ON public.usage_limits(user_id, month_year);

CREATE TRIGGER update_usage_limits_updated_at
  BEFORE UPDATE ON public.usage_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'usage_limits_select_own' AND tablename = 'usage_limits') THEN
    CREATE POLICY usage_limits_select_own ON public.usage_limits FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'usage_limits_insert_own' AND tablename = 'usage_limits') THEN
    CREATE POLICY usage_limits_insert_own ON public.usage_limits FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'usage_limits_update_own' AND tablename = 'usage_limits') THEN
    CREATE POLICY usage_limits_update_own ON public.usage_limits FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'usage_limits_service_all' AND tablename = 'usage_limits') THEN
    CREATE POLICY usage_limits_service_all ON public.usage_limits FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;


-- 3. Add file_size column to vault_entries
ALTER TABLE public.vault_entries ADD COLUMN IF NOT EXISTS file_size BIGINT;


-- 4. Auto-create a 'free' subscription for every new user
--    (existing users will get one lazily when they first hit a limit check)
CREATE OR REPLACE FUNCTION auto_create_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created_subscription ON public.users;
CREATE TRIGGER on_user_created_subscription
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION auto_create_subscription();


-- 5. Atomic usage counter increment (avoids read-then-write race condition)
CREATE OR REPLACE FUNCTION increment_usage_counter(
  p_user_id UUID,
  p_month_date DATE,
  p_column_name TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Ensure row exists
  INSERT INTO public.usage_limits (user_id, month_year)
  VALUES (p_user_id, p_month_date)
  ON CONFLICT (user_id, month_year) DO NOTHING;

  -- Atomic increment using dynamic SQL
  EXECUTE format(
    'UPDATE public.usage_limits SET %I = %I + 1 WHERE user_id = $1 AND month_year = $2',
    p_column_name, p_column_name
  ) USING p_user_id, p_month_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
