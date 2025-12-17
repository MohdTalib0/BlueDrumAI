import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

/**
 * Error handler middleware
 * Prevents information disclosure in production
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const isProduction = process.env.NODE_ENV === 'production'
  const requestId = (req as any).id || req.headers['x-request-id'] || crypto.randomUUID()
  
  // Determine status code
  const status = err.status || err.statusCode || 500
  
  // Log full error server-side (never expose to client)
  console.error(`[${requestId}] Error:`, {
    message: err.message,
    stack: isProduction ? undefined : err.stack,
    path: req.path,
    method: req.method,
    status,
    // Don't log sensitive data
    body: isProduction ? undefined : req.body,
  })
  
  // Return generic error to client in production
  const errorResponse: any = {
    ok: false,
    error: isProduction 
      ? status >= 500 
        ? 'An internal error occurred. Please try again later.'
        : err.message || 'Invalid request'
      : err.message || 'An error occurred',
    requestId, // Include for support/debugging
  }
  
  // Only include details in development
  if (!isProduction && err.details) {
    errorResponse.details = err.details
  }
  
  res.status(status).json(errorResponse)
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response) {
  const requestId = (req as any).id || req.headers['x-request-id'] || crypto.randomUUID()
  res.status(404).json({
    ok: false,
    error: 'Not found',
    requestId,
  })
}

