// Supabase client for Edge Functions — singleton cached at module scope
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

let _serviceClient: SupabaseClient | null = null

function getServiceClient(): SupabaseClient {
  if (_serviceClient) return _serviceClient
  _serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { 'x-client-info': 'supabase-edge-function' } },
    },
  )
  return _serviceClient
}

export function createSupabaseClient(_req: Request): SupabaseClient {
  return getServiceClient()
}

export { getServiceClient }

export { verifyAuth } from './auth.ts'
