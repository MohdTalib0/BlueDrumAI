// Supabase client for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

export function createSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Use service role key for admin access (bypasses RLS)
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-client-info': 'supabase-edge-function',
      },
    },
  })
}

