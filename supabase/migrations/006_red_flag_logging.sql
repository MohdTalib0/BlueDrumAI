-- Red Flag Experience, Comparison, and Demo logging

create table if not exists public.red_flag_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scenario_type text not null,
  conversation jsonb not null,
  ai_response text,
  red_flags jsonb,
  educational_note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_red_flag_experiences_user_created_at on public.red_flag_experiences(user_id, created_at desc);

create table if not exists public.analysis_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  analysis_ids uuid[] not null,
  comparison_result jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_analysis_comparisons_user_created_at on public.analysis_comparisons(user_id, created_at desc);

create table if not exists public.demo_red_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  prompt text not null,
  ai_response text,
  red_flags jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_demo_red_flags_user_created_at on public.demo_red_flags(user_id, created_at desc);


