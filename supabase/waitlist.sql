-- Blue Drum AI - Waitlist table
-- Run this in Supabase SQL editor.

-- Supabase usually has pgcrypto enabled, but enable it just in case.
create extension if not exists "pgcrypto";

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  interest text not null check (interest in ('male', 'female', 'both')),
  source text not null default 'landing_page',
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Optional: enable RLS (service role bypasses this anyway).
alter table public.waitlist enable row level security;

-- No policies = anon cannot read/write.


