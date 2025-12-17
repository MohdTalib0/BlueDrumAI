-- Add fields to track multiple risk checks and event sequence
-- Run this migration in Supabase SQL editor

-- Add sources array to track all sources in order
ALTER TABLE public.waitlist 
ADD COLUMN IF NOT EXISTS sources text[] DEFAULT ARRAY[]::text[];

-- Add last_source to track most recent source
ALTER TABLE public.waitlist 
ADD COLUMN IF NOT EXISTS last_source text;

-- Add updated_at to track when entry was last modified
ALTER TABLE public.waitlist 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_waitlist_updated_at ON public.waitlist;
CREATE TRIGGER update_waitlist_updated_at
    BEFORE UPDATE ON public.waitlist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

