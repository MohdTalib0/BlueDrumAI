// Lightweight request logger — fire-and-forget insert into api_logs
import { getServiceClient } from './supabase.ts'

interface LogEntry {
  user_id?: string
  method: string
  endpoint: string
  status_code: number
  response_time_ms: number
  ip_address?: string
  user_agent?: string
  request_id?: string
  error_message?: string
  metadata?: Record<string, unknown>
}

export function logRequest(entry: LogEntry) {
  try {
    const sb = getServiceClient()
    sb.from('api_logs')
      .insert({
        user_id: entry.user_id || null,
        method: entry.method,
        endpoint: entry.endpoint,
        status_code: entry.status_code,
        response_time_ms: entry.response_time_ms,
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || null,
        request_id: entry.request_id || crypto.randomUUID(),
        error_message: entry.error_message || null,
        metadata: entry.metadata || null,
      })
      .then(({ error }) => {
        if (error) console.error('api_logs insert failed:', error.message)
      })
  } catch (e) {
    console.error('logRequest error:', e)
  }
}

/**
 * Wrap an edge-function handler to automatically log every request.
 * Usage:
 *   serve(withRequestLogging('my-function', async (req) => { ... return response }))
 */
export function withRequestLogging(
  functionName: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const start = Date.now()
    const url = new URL(req.url)
    const path = url.pathname.replace(new RegExp(`.*/${functionName}`), '') || '/'
    const endpoint = `${functionName}${path}`
    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || undefined
    const ua = req.headers.get('user-agent') || undefined
    const reqId = crypto.randomUUID()

    let response: Response
    let errorMsg: string | undefined
    try {
      response = await handler(req)
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : 'Unknown error'
      response = new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    logRequest({
      method: req.method,
      endpoint,
      status_code: response.status,
      response_time_ms: Date.now() - start,
      ip_address: ip,
      user_agent: ua,
      request_id: reqId,
      error_message: errorMsg || (response.status >= 400 ? `HTTP ${response.status}` : undefined),
    })

    return response
  }
}
