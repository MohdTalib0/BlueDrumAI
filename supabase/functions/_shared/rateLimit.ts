const requestCounts = new Map<string, { count: number; resetAt: number }>()

/**
 * In-memory rate limiter for edge functions.
 * Returns { allowed: true } if under limit, { allowed: false, retryAfter } otherwise.
 * Note: Each edge function instance has its own memory, so this is per-instance.
 * For production, use a Redis/DB-backed solution.
 */
export function checkRateLimit(
  userId: string,
  endpoint: string,
  maxRequests: number = 10,
  windowMs: number = 60_000,
): { allowed: boolean; retryAfter?: number } {
  const key = `${userId}:${endpoint}`
  const now = Date.now()
  const entry = requestCounts.get(key)

  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  entry.count++
  return { allowed: true }
}

export function rateLimitResponse(retryAfter: number, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ ok: false, error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    },
  )
}
