// Authentication helper for Edge Functions
import { createSupabaseClient } from './supabase.ts'

export interface AuthUser {
  id: string
  email?: string | null
}

/**
 * Verify Supabase JWT from Authorization header
 */
export async function verifyAuth(req: Request): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
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
  } catch (err) {
    console.error('Auth verification error:', err)
    return { user: null, error: 'Authentication failed' }
  }
}

/**
 * Get user ID from request (requires auth)
 */
export async function getUserId(req: Request): Promise<string | null> {
  const { user, error } = await verifyAuth(req)
  if (error || !user) {
    return null
  }
  return user.id
}

