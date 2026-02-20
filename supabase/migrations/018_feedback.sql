-- ============================================================================
-- 018: User feedback table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  type        TEXT        NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'other')),
  title       TEXT        NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description TEXT        NOT NULL CHECK (char_length(description) BETWEEN 10 AND 5000),
  status      TEXT        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id   ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type      ON public.feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status    ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- RLS: users can insert their own feedback; only service role can read/update
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'feedback_insert_own' AND tablename = 'feedback'
  ) THEN
    CREATE POLICY feedback_insert_own ON public.feedback
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'feedback_service_all' AND tablename = 'feedback'
  ) THEN
    CREATE POLICY feedback_service_all ON public.feedback
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
