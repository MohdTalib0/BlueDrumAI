import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { getUserId } from '../_shared/auth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getFullUsageSummary, type PlanId } from '../_shared/subscription.ts'

function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function json(body: unknown, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/subscription/, '') || '/'

  try {
    // ── POST /webhook — Razorpay webhook (no auth, uses signature verification) ─
    if (req.method === 'POST' && path === '/webhook') {
      return await handleWebhook(req, corsHeaders)
    }

    // All other endpoints require auth
    const userId = await getUserId(req)
    if (!userId) {
      return json({ ok: false, error: 'Unauthorized' }, 401, corsHeaders)
    }

    // ── GET /status — Current subscription + usage ──
    if (req.method === 'GET' && path === '/status') {
      const summary = await getFullUsageSummary(userId)
      return json({ ok: true, ...summary }, 200, corsHeaders)
    }

    // ── POST /create — Create Razorpay subscription ──
    if (req.method === 'POST' && path === '/create') {
      return await handleCreate(userId, req, corsHeaders)
    }

    // ── POST /cancel — Cancel subscription at period end ──
    if (req.method === 'POST' && path === '/cancel') {
      return await handleCancel(userId, corsHeaders)
    }

    // ── POST /verify — Verify payment after checkout ──
    if (req.method === 'POST' && path === '/verify') {
      return await handleVerify(userId, req, corsHeaders)
    }

    return json({ ok: false, error: 'Not found' }, 404, corsHeaders)
  } catch (err) {
    console.error('Subscription error:', err)
    return json({ ok: false, error: 'Server error' }, 500, corsHeaders)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /create — Create Razorpay subscription
// ═══════════════════════════════════════════════════════════════════════════════

async function handleCreate(userId: string, req: Request, corsHeaders: Record<string, string>) {
  const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')
  const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
  const RAZORPAY_PLAN_ID = Deno.env.get('RAZORPAY_PLAN_ID') // monthly ₹199 plan created in Razorpay dashboard

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || !RAZORPAY_PLAN_ID) {
    return json({ ok: false, error: 'Payment gateway not configured' }, 503, corsHeaders)
  }

  const db = getServiceClient()

  // Check if already premium
  const { data: existingSub } = await db
    .from('subscriptions')
    .select('plan, status, razorpay_subscription_id, razorpay_customer_id')
    .eq('user_id', userId)
    .single()

  if (existingSub?.plan === 'premium' && existingSub?.status === 'active') {
    return json({ ok: false, error: 'Already on Premium plan' }, 400, corsHeaders)
  }

  // Get user email for Razorpay customer
  const { data: userData } = await db
    .from('users')
    .select('email, first_name, last_name, phone_number')
    .eq('id', userId)
    .single()

  if (!userData?.email) {
    return json({ ok: false, error: 'User email not found' }, 400, corsHeaders)
  }

  const authHeader = 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)

  // Create or retrieve Razorpay customer
  let customerId = existingSub?.razorpay_customer_id as string | undefined

  if (!customerId) {
    const custBody: Record<string, unknown> = {
      name: [userData.first_name, userData.last_name].filter(Boolean).join(' ') || 'User',
      email: userData.email,
      fail_existing: 0,
    }
    if (userData.phone_number) custBody.contact = userData.phone_number

    const custRes = await fetch('https://api.razorpay.com/v1/customers', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(custBody),
    })
    const custData = await custRes.json()
    if (!custData.id) {
      console.error('Razorpay customer creation failed:', custData?.error?.code || 'unknown')
      return json({ ok: false, error: 'Failed to create payment customer' }, 500, corsHeaders)
    }
    customerId = custData.id
  }

  // Create Razorpay subscription
  const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan_id: RAZORPAY_PLAN_ID,
      customer_id: customerId,
      total_count: 120, // max 10 years
      quantity: 1,
      notes: { user_id: userId },
    }),
  })

  const subData = await subRes.json()
  if (!subData.id) {
    console.error('Razorpay subscription creation failed:', subData?.error?.code || 'unknown')
    return json({ ok: false, error: 'Failed to create subscription' }, 500, corsHeaders)
  }

  // Save Razorpay IDs to our DB (still 'free' until payment confirmed)
  await db
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan: 'free',
      status: 'active',
      razorpay_subscription_id: subData.id,
      razorpay_customer_id: customerId,
    }, { onConflict: 'user_id' })

  return json({
    ok: true,
    subscription_id: subData.id,
    short_url: subData.short_url,
    razorpay_key: RAZORPAY_KEY_ID,
  }, 200, corsHeaders)
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /verify — Verify payment after Razorpay checkout
// ═══════════════════════════════════════════════════════════════════════════════

async function handleVerify(userId: string, req: Request, corsHeaders: Record<string, string>) {
  const body = await req.json()
  const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = body

  if (!razorpay_subscription_id || !razorpay_payment_id || !razorpay_signature) {
    return json({ ok: false, error: 'Missing payment verification data' }, 400, corsHeaders)
  }

  const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
  if (!RAZORPAY_KEY_SECRET) {
    return json({ ok: false, error: 'Payment gateway not configured' }, 503, corsHeaders)
  }

  // Verify signature
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(RAZORPAY_KEY_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const data = encoder.encode(`${razorpay_payment_id}|${razorpay_subscription_id}`)
  const signatureBytes = await crypto.subtle.sign('HMAC', key, data)
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  if (expectedSignature !== razorpay_signature) {
    return json({ ok: false, error: 'Invalid payment signature' }, 400, corsHeaders)
  }

  // Activate premium
  const db = getServiceClient()
  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  await db
    .from('subscriptions')
    .update({
      plan: 'premium',
      status: 'active',
      razorpay_subscription_id,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancelled_at: null,
    })
    .eq('user_id', userId)

  return json({ ok: true, plan: 'premium' }, 200, corsHeaders)
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /webhook — Razorpay webhook events
// ═══════════════════════════════════════════════════════════════════════════════

async function handleWebhook(req: Request, corsHeaders: Record<string, string>) {
  const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
  if (!WEBHOOK_SECRET) {
    return json({ ok: false }, 500, corsHeaders)
  }

  const bodyText = await req.text()
  const signature = req.headers.get('x-razorpay-signature') || ''

  // Verify webhook signature
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText))
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  if (expectedSignature !== signature) {
    console.error('Webhook signature mismatch')
    return json({ ok: false }, 400, corsHeaders)
  }

  let event: any
  try {
    event = JSON.parse(bodyText)
  } catch {
    console.error('Webhook body is not valid JSON')
    return json({ ok: false }, 400, corsHeaders)
  }
  const db = getServiceClient()

  const subscriptionId = event.payload?.subscription?.entity?.id
  if (!subscriptionId) {
    return json({ ok: true }, 200, corsHeaders) // irrelevant event
  }

  // Find user by razorpay_subscription_id
  const { data: sub } = await db
    .from('subscriptions')
    .select('user_id')
    .eq('razorpay_subscription_id', subscriptionId)
    .single()

  if (!sub) {
    console.warn('Webhook for unknown subscription:', subscriptionId)
    return json({ ok: true }, 200, corsHeaders)
  }

  const eventType = event.event

  if (eventType === 'subscription.activated' || eventType === 'subscription.charged') {
    const entity = event.payload.subscription.entity
    await db.from('subscriptions').update({
      plan: 'premium',
      status: 'active',
      current_period_start: entity.current_start ? new Date(entity.current_start * 1000).toISOString() : undefined,
      current_period_end: entity.current_end ? new Date(entity.current_end * 1000).toISOString() : undefined,
    }).eq('user_id', sub.user_id)
  }

  if (eventType === 'subscription.halted' || eventType === 'subscription.pending') {
    await db.from('subscriptions').update({
      status: 'past_due',
    }).eq('user_id', sub.user_id)
  }

  if (eventType === 'subscription.cancelled' || eventType === 'subscription.completed') {
    await db.from('subscriptions').update({
      plan: 'free',
      status: 'expired',
      cancelled_at: new Date().toISOString(),
    }).eq('user_id', sub.user_id)
  }

  return json({ ok: true }, 200, corsHeaders)
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /cancel — Cancel at end of billing period
// ═══════════════════════════════════════════════════════════════════════════════

async function handleCancel(userId: string, corsHeaders: Record<string, string>) {
  const db = getServiceClient()

  const { data: sub } = await db
    .from('subscriptions')
    .select('plan, status, razorpay_subscription_id')
    .eq('user_id', userId)
    .single()

  if (!sub || sub.plan !== 'premium' || sub.status !== 'active') {
    return json({ ok: false, error: 'No active premium subscription to cancel' }, 400, corsHeaders)
  }

  // Cancel in Razorpay (at end of period)
  if (sub.razorpay_subscription_id) {
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
      const authHeader = 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
      await fetch(`https://api.razorpay.com/v1/subscriptions/${sub.razorpay_subscription_id}/cancel`, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel_at_cycle_end: 1 }),
      })
    }
  }

  // Mark as cancelled (still active until period end)
  await db.from('subscriptions').update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
  }).eq('user_id', userId)

  return json({ ok: true, message: 'Subscription will end at the current billing period' }, 200, corsHeaders)
}
