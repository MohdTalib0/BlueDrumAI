import { getServiceClient } from './supabase.ts'

// Plan limits
const PLAN_LIMITS = {
  free: {
    ai_analyses: 5,
    pdf_exports: 3,
    vault_uploads: 50,
    breakup: 3,
    red_flag: 3,
    storage_bytes: 100 * 1024 * 1024,   // 100 MB
  },
  premium: {
    ai_analyses: -1,   // unlimited
    pdf_exports: -1,
    vault_uploads: -1,
    breakup: -1,
    red_flag: -1,
    storage_bytes: 5 * 1024 * 1024 * 1024,  // 5 GB
  },
} as const

export type PlanId = keyof typeof PLAN_LIMITS
export type LimitKey = 'ai_analyses' | 'pdf_exports' | 'vault_uploads' | 'breakup' | 'red_flag'

const LIMIT_TO_COLUMN: Record<LimitKey, string> = {
  ai_analyses:  'ai_analyses_count',
  pdf_exports:  'pdf_exports_count',
  vault_uploads: 'vault_uploads_count',
  breakup:      'breakup_count',
  red_flag:     'red_flag_count',
}

function currentMonthDate(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export interface SubscriptionInfo {
  plan: PlanId
  status: string
}

async function getUserSubscription(userId: string): Promise<SubscriptionInfo> {
  const db = getServiceClient()
  const { data } = await db
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .single()

  if (data && (data.status === 'active' || data.status === 'cancelled')) {
    return { plan: data.plan as PlanId, status: data.status }
  }

  // No subscription found — create free one lazily
  await db.from('subscriptions').upsert(
    { user_id: userId, plan: 'free', status: 'active' },
    { onConflict: 'user_id' },
  )
  return { plan: 'free', status: 'active' }
}

async function getOrCreateUsageRow(userId: string, monthDate: string) {
  const db = getServiceClient()
  const { data } = await db
    .from('usage_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('month_year', monthDate)
    .single()

  if (data) return data

  const { data: inserted } = await db
    .from('usage_limits')
    .upsert(
      { user_id: userId, month_year: monthDate },
      { onConflict: 'user_id,month_year' },
    )
    .select()
    .single()

  return inserted || {
    ai_analyses_count: 0,
    pdf_exports_count: 0,
    vault_uploads_count: 0,
    breakup_count: 0,
    red_flag_count: 0,
  }
}

export interface LimitCheckResult {
  allowed: boolean
  current: number
  limit: number         // -1 = unlimited
  plan: PlanId
  upgradeNeeded?: boolean
}

export async function checkUsageLimit(userId: string, limitKey: LimitKey): Promise<LimitCheckResult> {
  const sub = await getUserSubscription(userId)
  const cap = PLAN_LIMITS[sub.plan][limitKey]

  // -1 = unlimited
  if (cap === -1) {
    return { allowed: true, current: 0, limit: -1, plan: sub.plan }
  }

  const monthDate = currentMonthDate()
  const usage = await getOrCreateUsageRow(userId, monthDate)
  const col = LIMIT_TO_COLUMN[limitKey]
  const current = (usage as Record<string, number>)[col] || 0

  if (current >= cap) {
    return { allowed: false, current, limit: cap, plan: sub.plan, upgradeNeeded: true }
  }

  return { allowed: true, current, limit: cap, plan: sub.plan }
}

export async function incrementUsageSimple(userId: string, limitKey: LimitKey): Promise<void> {
  const db = getServiceClient()
  const monthDate = currentMonthDate()
  const col = LIMIT_TO_COLUMN[limitKey]

  // Atomic increment via RPC (handles row creation + increment in one DB call)
  const { error } = await db.rpc('increment_usage_counter', {
    p_user_id: userId,
    p_month_date: monthDate,
    p_column_name: col,
  })

  if (error) {
    console.error('Failed to increment usage counter:', error)
  }
}

export interface StorageLimitResult {
  allowed: boolean
  usedBytes: number
  limitBytes: number   // -1 = unlimited
  plan: PlanId
  upgradeNeeded?: boolean
}

export async function checkStorageLimit(userId: string, newFileBytes: number): Promise<StorageLimitResult> {
  const sub = await getUserSubscription(userId)
  const cap = PLAN_LIMITS[sub.plan].storage_bytes

  if (cap === -1) {
    return { allowed: true, usedBytes: 0, limitBytes: -1, plan: sub.plan }
  }

  const db = getServiceClient()
  const { data } = await db
    .from('vault_entries')
    .select('file_size')
    .eq('user_id', userId)

  const usedBytes = (data || []).reduce(
    (sum: number, row: { file_size: number | null }) => sum + (row.file_size || 0), 0,
  )

  if (usedBytes + newFileBytes > cap) {
    return { allowed: false, usedBytes, limitBytes: cap, plan: sub.plan, upgradeNeeded: true }
  }

  return { allowed: true, usedBytes, limitBytes: cap, plan: sub.plan }
}

export function limitReachedResponse(
  limitKey: string,
  result: LimitCheckResult | StorageLimitResult,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: 'limit_reached',
      limitKey,
      current: 'usedBytes' in result ? result.usedBytes : result.current,
      limit: 'limitBytes' in result ? result.limitBytes : result.limit,
      plan: result.plan,
      upgradeNeeded: true,
    }),
    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

/**
 * Combined check for vault uploads: single subscription lookup, parallel usage + storage check.
 * Avoids the duplicate getUserSubscription() call that happens when checkUsageLimit and
 * checkStorageLimit are called independently.
 */
export async function checkUploadLimits(
  userId: string,
  newFileBytes: number,
): Promise<{ usageResult: LimitCheckResult; storageResult: StorageLimitResult }> {
  const sub = await getUserSubscription(userId)
  const usageCap = PLAN_LIMITS[sub.plan].vault_uploads
  const storageCap = PLAN_LIMITS[sub.plan].storage_bytes
  const db = getServiceClient()
  const monthDate = currentMonthDate()

  // If both unlimited, skip queries entirely
  if (usageCap === -1 && storageCap === -1) {
    return {
      usageResult: { allowed: true, current: 0, limit: -1, plan: sub.plan },
      storageResult: { allowed: true, usedBytes: 0, limitBytes: -1, plan: sub.plan },
    }
  }

  // Run usage + storage queries in parallel
  const [usageRow, storageRes] = await Promise.all([
    usageCap === -1 ? null : getOrCreateUsageRow(userId, monthDate),
    storageCap === -1 ? null : db.from('vault_entries').select('file_size').eq('user_id', userId),
  ])

  let usageResult: LimitCheckResult
  if (usageCap === -1) {
    usageResult = { allowed: true, current: 0, limit: -1, plan: sub.plan }
  } else {
    const current = ((usageRow as Record<string, number>)?.vault_uploads_count) || 0
    usageResult = current >= usageCap
      ? { allowed: false, current, limit: usageCap, plan: sub.plan, upgradeNeeded: true }
      : { allowed: true, current, limit: usageCap, plan: sub.plan }
  }

  let storageResult: StorageLimitResult
  if (storageCap === -1) {
    storageResult = { allowed: true, usedBytes: 0, limitBytes: -1, plan: sub.plan }
  } else {
    const usedBytes = (storageRes?.data || []).reduce(
      (s: number, r: { file_size: number | null }) => s + (r.file_size || 0), 0,
    )
    storageResult = (usedBytes + newFileBytes > storageCap)
      ? { allowed: false, usedBytes, limitBytes: storageCap, plan: sub.plan, upgradeNeeded: true }
      : { allowed: true, usedBytes, limitBytes: storageCap, plan: sub.plan }
  }

  return { usageResult, storageResult }
}

export async function getFullUsageSummary(userId: string) {
  const sub = await getUserSubscription(userId)
  const limits = PLAN_LIMITS[sub.plan]
  const db = getServiceClient()
  const monthDate = currentMonthDate()

  // Three parallel queries:
  // 1. usage_limits row (monthly counters — O(1) lookup, single row)
  // 2. vault file count (total cap, not monthly)
  // 3. vault storage sum (from file_size column)
  const [usageRow, vaultCountRes, storageSumRes] = await Promise.all([
    getOrCreateUsageRow(userId, monthDate),

    db.from('vault_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),

    db.from('vault_entries')
      .select('file_size')
      .eq('user_id', userId),
  ])

  const usage = usageRow as Record<string, number>
  const storageUsed = (storageSumRes.data || []).reduce(
    (s: number, r: { file_size: number | null }) => s + (r.file_size || 0), 0,
  )

  return {
    plan: sub.plan,
    status: sub.status,
    usage: {
      ai_analyses:   { used: usage.ai_analyses_count  || 0, limit: limits.ai_analyses },
      pdf_exports:   { used: usage.pdf_exports_count   || 0, limit: limits.pdf_exports },
      vault_uploads: { used: vaultCountRes.count       ?? 0, limit: limits.vault_uploads },
      breakup:       { used: usage.breakup_count       || 0, limit: limits.breakup },
      red_flag:      { used: usage.red_flag_count      || 0, limit: limits.red_flag },
      storage: {
        used_bytes:  storageUsed,
        limit_bytes: limits.storage_bytes,
      },
    },
  }
}

export { PLAN_LIMITS }
