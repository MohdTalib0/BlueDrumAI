// Authentication helper for Edge Functions — local JWT verification (no network round-trip)
import { decode as base64UrlDecode } from 'https://deno.land/std@0.168.0/encoding/base64url.ts'

export interface AuthUser {
  id: string
  email?: string | null
}

const encoder = new TextEncoder()

let _cryptoKey: CryptoKey | null = null

async function getSigningKey(): Promise<CryptoKey> {
  if (_cryptoKey) return _cryptoKey
  const secret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET')
  if (!secret) throw new Error('JWT_SECRET not set')
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

/**
 * Verify Supabase JWT from Authorization header (local, ~0ms)
 */
export async function verifyAuth(req: Request): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return { user: null, error: 'Missing authorization token' }
    }

    const payload = await verifyJwt(token)
    if (!payload || !payload.sub) {
      return { user: null, error: 'Invalid token' }
    }

    return {
      user: {
        id: payload.sub as string,
        email: (payload.email as string) ?? null,
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

