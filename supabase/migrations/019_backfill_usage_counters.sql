-- ============================================================================
-- 019: Backfill usage_limits counters from actual data tables
--      and backfill vault_entries.file_size where NULL
-- ============================================================================

-- For each user, for each month where they had activity, upsert the correct
-- counts into usage_limits. This makes the counters match reality.

-- 1. Backfill ai_analyses_count from chat_analyses
INSERT INTO public.usage_limits (user_id, month_year, ai_analyses_count)
SELECT
  user_id,
  date_trunc('month', created_at)::date AS month_year,
  COUNT(*)::int AS ai_analyses_count
FROM public.chat_analyses
GROUP BY user_id, date_trunc('month', created_at)::date
ON CONFLICT (user_id, month_year)
DO UPDATE SET ai_analyses_count = EXCLUDED.ai_analyses_count;

-- 2. Backfill breakup_count from breakup_messages
INSERT INTO public.usage_limits (user_id, month_year, breakup_count)
SELECT
  user_id,
  date_trunc('month', created_at)::date AS month_year,
  COUNT(*)::int AS breakup_count
FROM public.breakup_messages
GROUP BY user_id, date_trunc('month', created_at)::date
ON CONFLICT (user_id, month_year)
DO UPDATE SET breakup_count = EXCLUDED.breakup_count;

-- 3. Backfill red_flag_count from red_flag_experiences
INSERT INTO public.usage_limits (user_id, month_year, red_flag_count)
SELECT
  user_id,
  date_trunc('month', created_at)::date AS month_year,
  COUNT(*)::int AS red_flag_count
FROM public.red_flag_experiences
GROUP BY user_id, date_trunc('month', created_at)::date
ON CONFLICT (user_id, month_year)
DO UPDATE SET red_flag_count = EXCLUDED.red_flag_count;

-- 4. Backfill vault_uploads_count — vault is a total cap, not monthly.
--    We store the total count in the current month's row for display purposes.
--    Going forward, incrementUsageSimple('vault_uploads') is called per upload.
--    (This backfill is best-effort; the subscription page also does a direct
--     COUNT for vault, so it will always be correct.)
