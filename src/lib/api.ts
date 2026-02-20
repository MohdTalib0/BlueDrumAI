// API utility functions for Supabase Edge Functions

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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
 * Get headers for authenticated requests
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Add Supabase anon key for public functions or auth token for protected functions
  if (supabaseAnonKey) {
    headers['apikey'] = supabaseAnonKey
    headers['Authorization'] = `Bearer ${supabaseAnonKey}`
  }

  return headers
}

import { supabase } from './supabase'

/**
 * Get headers for authenticated requests with user's session token
 */
export async function getAuthHeadersWithSession(): Promise<Record<string, string>> {
  const headers = getAuthHeaders()

  // Try to get the user's session token from Supabase
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

/**
 * Make an authenticated API request
 */
export async function apiRequest(
  functionName: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = getEdgeFunctionUrl(functionName)
  const headers = await getAuthHeadersWithSession()
  
  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })
}

