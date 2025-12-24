import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../supabase'
import { getUserId } from './auth'

/**
 * Audit logger middleware
 * Logs all data-modifying operations for compliance and debugging
 */
export async function logAuditEvent(
  req: Request,
  action: 'create' | 'update' | 'delete' | 'view' | 'export',
  resourceType: string,
  resourceId?: string,
  changes?: { before?: any; after?: any },
) {
  try {
    const userId = getUserId(req)
    const ip = (req as any).ip || req.socket.remoteAddress || null
    const userAgent = req.headers['user-agent']?.toString().slice(0, 512) || null
    const requestId = (req as any).id || req.headers['x-request-id'] || null

    // Get user's Supabase ID if authenticated
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      changes: changes ? { before: changes.before, after: changes.after } : null,
      ip_address: ip,
      user_agent: userAgent,
      request_id: requestId,
      metadata: {
        method: req.method,
        path: req.path,
        query: req.query,
      },
    })
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Failed to log audit event:', error)
  }
}

/**
 * Middleware to automatically log API requests
 */
export function apiLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()
  const requestId = (req as any).id || req.headers['x-request-id'] || null

  // Override res.json to capture response
  const originalJson = res.json.bind(res)
  res.json = function (body: any) {
    const responseTime = Date.now() - startTime
    const userId = getUserId(req)
    const ip = (req as any).ip || req.socket.remoteAddress || null
    const userAgent = req.headers['user-agent']?.toString().slice(0, 512) || null

    // Log API request asynchronously (don't block response)
    logApiRequest({
      userId,
      method: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      responseTime,
      ip,
      userAgent,
      requestId,
      requestSize: JSON.stringify(req.body).length,
      responseSize: JSON.stringify(body).length,
      errorMessage: res.statusCode >= 400 ? (body?.error || 'Request failed') : null,
    }).catch((err) => console.error('Failed to log API request:', err))

    return originalJson(body)
  }

  next()
}

async function logApiRequest(data: {
  userId: string | null
  method: string
  endpoint: string
  statusCode: number
  responseTime: number
  ip: string | null
  userAgent: string | null
  requestId: string | null
  requestSize: number
  responseSize: number
  errorMessage: string | null
}) {
  try {
    let supabaseUserId: string | null = null
    if (data.userId) {
      supabaseUserId = data.userId
    }

    await supabaseAdmin.from('api_logs').insert({
      user_id: supabaseUserId,
      method: data.method,
      endpoint: data.endpoint,
      status_code: data.statusCode,
      response_time_ms: data.responseTime,
      ip_address: data.ip,
      user_agent: data.userAgent,
      request_id: data.requestId,
      request_size_bytes: data.requestSize,
      response_size_bytes: data.responseSize,
      error_message: data.errorMessage,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to log API request:', error)
  }
}

/**
 * Log user activity
 */
export async function logUserActivity(
  req: Request,
  activityType: string,
  details?: Record<string, any>,
) {
  try {
    const userId = getUserId(req)
    if (!userId) return

    const ip = (req as any).ip || req.socket.remoteAddress || null
    const userAgent = req.headers['user-agent']?.toString().slice(0, 512) || null

    await supabaseAdmin.from('user_activities').insert({
      user_id: userId,
      activity_type: activityType,
      activity_details: details || {},
      ip_address: ip,
      user_agent: userAgent,
      session_id: req.headers['x-session-id']?.toString() || null,
      metadata: {
        method: req.method,
        path: req.path,
      },
    })

    // Update user's last_activity_at
    await supabaseAdmin
      .from('users')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', userId)
  } catch (error) {
    console.error('Failed to log user activity:', error)
  }
}

