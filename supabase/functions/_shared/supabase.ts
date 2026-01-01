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

// Export verifyAuth for convenience
export async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return { user: null, error: 'Missing authorization token' }
  }

  const supabase = createSupabaseClient(req)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data?.user) {
    return { user: null, error: 'Invalid token' }
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    error: null,
  }
}
