import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../supabase'

/**
 * Authenticated user shape attached to req
 */
export interface AuthUser {
  id: string
  email?: string | null
}

/**
 * Verify Supabase JWT from Authorization header (Bearer <access_token>)
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    ;(req as any).user = {
      id: data.user.id,
      email: data.user.email,
    } as AuthUser

    next()
  } catch (err) {
    console.error('Auth error:', err)
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }
}

/**
 * Optional auth middleware - attaches user if token is present; otherwise continues
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return next()
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (!error && data?.user) {
      ;(req as any).user = {
        id: data.user.id,
        email: data.user.email,
      } as AuthUser
    }
  } catch {
    // ignore optional failures
  } finally {
    next()
  }
}

/**
 * Helpers
 */
export function getUserId(req: Request): string | null {
  return (req as any).user?.id || null
}

export function getUserEmail(req: Request): string | null {
  return (req as any).user?.email || null
}

