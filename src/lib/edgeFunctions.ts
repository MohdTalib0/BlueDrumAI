// Supabase Edge Functions utility

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Get the URL for a Supabase Edge Function
 * Format: https://{project-ref}.supabase.co/functions/v1/{function-name}
 */
export function getEdgeFunctionUrl(functionName: string): string {
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not set. Please configure your Supabase project URL.')
  }
  
  return `${supabaseUrl}/functions/v1/${functionName}`
}

/**
 * Get headers for public Edge Functions (waitlist, risk-check)
 */
export function getPublicHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  // Add Supabase anon key for public functions
  if (supabaseAnonKey) {
    headers['apikey'] = supabaseAnonKey
    headers['Authorization'] = `Bearer ${supabaseAnonKey}`
  } else {
    throw new Error('VITE_SUPABASE_ANON_KEY is not set. Please configure your Supabase anon key.')
  }

  return headers
}

/**
 * Get headers for authenticated Edge Functions (requires user session)
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (!supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY is not set.')
  }

  // Add anon key (required by Supabase)
  headers['apikey'] = supabaseAnonKey

  // Get user's session token from Supabase Auth
  try {
    const { supabase } = await import('./supabase')
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    } else {
      throw new Error('No active session. Please sign in.')
    }
  } catch (error: any) {
    if (error.message?.includes('No active session')) {
      throw error
    }
    console.warn('Failed to get session token:', error)
    throw new Error('Authentication failed. Please sign in again.')
  }

  return headers
}

