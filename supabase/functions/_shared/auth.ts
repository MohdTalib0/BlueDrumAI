// Authentication helper for Edge Functions
// Fast path: local HMAC-SHA256 JWT verification (~0 ms)
// Fallback:  Supabase Auth API /auth/v1/user   (~80 ms)
import { decode as base64UrlDecode } from 'https://deno.land/std@0.168.0/encoding/base64url.ts'

export interface AuthUser {
  id: string
  email?: string | null
}

// ── Local JWT verification (fast path) ──────────────────────────────

const encoder = new TextEncoder()
let _cryptoKey: CryptoKey | null = null

async function getSigningKey(): Promise<CryptoKey> {
  if (_cryptoKey) return _cryptoKey
  const secret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET')
  if (!secret) throw new Error('JWT_SECRET / SUPABASE_JWT_SECRET not set')
  _cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  return _cryptoKey
}

async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const key = await getSigningKey()
    const data = encoder.encode(`${parts[0]}.${parts[1]}`)
    const signature = base64UrlDecode(parts[2])
    const valid = await crypto.subtle.verify('HMAC', key, signature, data)
    if (!valid) return null
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

// ── Network fallback via Supabase Auth API ──────────────────────────

async function verifyViaSupabaseAuth(token: string): Promise<AuthUser | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) return null

    const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: serviceKey,
      },
    })
    if (!resp.ok) return null

    const data = await resp.json()
    if (!data?.id) return null
    return { id: data.id, email: data.email ?? null }
  } catch {
    return null
  }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Verify Supabase JWT from Authorization header.
 * Tries local HMAC check first; falls back to Supabase Auth API if that fails.
 */
export async function verifyAuth(req: Request): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return { user: null, error: 'Missing authorization token' }
    }

    // Fast path — local JWT verification
    const payload = await verifyJwt(token)
    if (payload?.sub) {
      return {
        user: {
          id: payload.sub as string,
          email: (payload.email as string) ?? null,
        },
        error: null,
      }
    }

    // Fallback — ask Supabase Auth service
    const user = await verifyViaSupabaseAuth(token)
    if (user) {
      return { user, error: null }
    }

    return { user: null, error: 'Invalid token' }
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

