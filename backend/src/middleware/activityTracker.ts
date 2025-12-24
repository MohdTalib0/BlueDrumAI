import { Request, Response, NextFunction } from 'express'
import { logUserActivity } from './auditLogger'

/**
 * Activity tracker middleware
 * Tracks user activities for analytics
 */
export function activityTrackerMiddleware(req: Request, res: Response, next: NextFunction) {
  // Track activities asynchronously (don't block request)
  const activityType = getActivityType(req.path, req.method)
  if (activityType) {
    logUserActivity(req, activityType, {
      endpoint: req.path,
      method: req.method,
    }).catch((err) => console.error('Failed to track activity:', err))
  }

  next()
}

function getActivityType(path: string, method: string): string | null {
  // Map endpoints to activity types
  if (path === '/api/vault/upload' && method === 'POST') return 'file_upload'
  if (path.startsWith('/api/vault/entry/') && method === 'DELETE') return 'file_delete'
  if (path.startsWith('/api/vault/entry/') && method === 'GET') return 'file_view'
  if (path === '/api/vault/entries' && method === 'GET') return 'vault_view'
  if (path === '/api/auth/me' && method === 'PATCH') return 'profile_update'
  if (path === '/api/auth/me' && method === 'GET') return 'profile_view'
  if (path.startsWith('/api/export/')) return 'export_generated'

  return null
}

