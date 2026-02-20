import { useState, useCallback } from 'react'

interface LimitInfo {
  feature: string
  current: number
  limit: number
}

/**
 * Hook to detect subscription limit errors from API responses.
 * Returns a state + helper to check responses and show the upgrade prompt.
 *
 * Usage:
 *   const { limitInfo, checkResponse, clearLimit } = useLimitGuard()
 *   // In your API call:
 *   const res = await fetch(...)
 *   if (!res.ok && checkResponse(await res.clone().json())) return
 *   // In JSX:
 *   {limitInfo && <UpgradePrompt {...limitInfo} onClose={clearLimit} />}
 */
export function useLimitGuard() {
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null)

  const checkResponse = useCallback((body: any): boolean => {
    if (body?.error === 'limit_reached' && body?.upgradeNeeded) {
      setLimitInfo({
        feature: body.limitKey || 'usage',
        current: body.current ?? 0,
        limit: body.limit ?? 0,
      })
      return true
    }
    return false
  }, [])

  const clearLimit = useCallback(() => setLimitInfo(null), [])

  return { limitInfo, checkResponse, clearLimit }
}
