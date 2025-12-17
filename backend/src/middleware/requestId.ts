import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

/**
 * Request ID middleware
 * Adds unique request ID for tracing and correlation
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID()
  ;(req as any).id = requestId
  res.setHeader('X-Request-ID', requestId)
  next()
}

