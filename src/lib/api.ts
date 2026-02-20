// API utility functions for Supabase Edge Functions

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

/**
 * Get the base URL for Supabase Edge Functions
 */
export function getEdgeFunctionUrl(functionName: string): string {
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not configured. Check your environment variables.')
  }
  return `${supabaseUrl}/functions/v1/${functionName}`
}

/**
 * Build auth headers synchronously from a known session token (no async round-trip).
 */
export function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * @deprecated Use `authHeaders(token)` with the token from useAuth().sessionToken instead.
 */
export async function getAuthHeadersWithSession(): Promise<Record<string, string>> {
  const { supabase } = await import('./supabase')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
  } catch (error) {
    console.warn('Failed to get session token:', error)
  }
  return headers
}

