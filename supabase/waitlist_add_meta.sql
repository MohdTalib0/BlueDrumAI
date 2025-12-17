-- Run this if you already created the waitlist table before we added meta.
alter table public.waitlist
add column if not exists meta jsonb;


