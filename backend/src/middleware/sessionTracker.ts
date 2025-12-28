import { Request, Response, NextFunction } from 'express'
import { getUserId } from './auth'
import { supabaseAdmin } from '../supabase'
import { trackLogin } from '../services/analytics'

/**
 * Session tracker middleware
 * Tracks user login sessions and updates last_login_at
 */
export async function trackSession(req: Request, res: Response, next: NextFunction) {
  const userId = getUserId(req)
  if (!userId) {
    return next()
  }

  try {
    // Check if this is a new session (first request after auth)
    const sessionId = req.headers['x-session-id']?.toString()
    const isNewSession = !sessionId || sessionId === 'new'

    if (isNewSession) {
      // Get user's Supabase ID
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, last_login_at')
        .eq('id', userId)
        .single()

      if (user) {
        const ip = (req as any).ip || req.socket.remoteAddress || null
        const userAgent = req.headers['user-agent']?.toString().slice(0, 512) || null

        // Update last_login_at if it's been more than 1 hour since last login
        const lastLogin = user.last_login_at
          ? new Date(user.last_login_at).getTime()
          : 0
        const oneHourAgo = Date.now() - 60 * 60 * 1000

        if (!lastLogin || lastLogin < oneHourAgo) {
          await supabaseAdmin
            .from('users')
            .update({
              last_login_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
              login_count: (user as any).login_count ? (user as any).login_count + 1 : 1,
            })
            .eq('id', user.id)

          // Track login event
          try {
            await trackLogin(userId, ip || undefined, userAgent || undefined)
          } catch {
            // Don't fail if analytics tracking fails
          }

          // Create session record
          try {
            await supabaseAdmin
              .from('user_sessions')
              .insert({
                user_id: user.id,
                session_id: sessionId || null,
                ip_address: ip,
                user_agent: userAgent,
                is_active: true,
                last_activity_at: new Date().toISOString(),
              })
          } catch {
            // Don't fail if session tracking fails
          }
        } else {
          // Update last activity
          try {
            await supabaseAdmin
              .from('users')
              .update({ last_activity_at: new Date().toISOString() })
              .eq('id', user.id)
          } catch {
            // Don't fail if update fails
          }
        }
      }
    } else {
      // Update session activity
      try {
        await supabaseAdmin
          .from('user_sessions')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('session_id', sessionId)
      } catch {
        // Don't fail if update fails
      }
    }
  } catch (error) {
    // Don't fail the request if session tracking fails
    console.error('Failed to track session:', error)
  }

  next()
}

