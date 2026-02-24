import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { getUserId } from '../_shared/auth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getFullUsageSummary, type PlanId } from '../_shared/subscription.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Blue Drum AI <noreply@mail.bluedrumai.com>'
const APP_URL = Deno.env.get('APP_URL') || 'https://beta.bluedrumai.com'

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

// ═══════════════════════════════════════════════════════════════════════════════
// Email helpers
// ═══════════════════════════════════════════════════════════════════════════════

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    })
  } catch (err) {
    console.error('Email send failed:', err)
  }
}

function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9;">
<tr>
<td align="center" style="padding: 40px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">

  <!-- Logo + Brand -->
  <tr>
    <td align="center" style="padding-bottom: 32px;">
      <a href="${APP_URL}" style="text-decoration: none;">
        <img src="https://i.ibb.co/WvFF3DKn/logo.png" alt="BlueDrumAI" width="48" height="48" style="display: block; border-radius: 12px; margin: 0 auto 10px;">
        <span style="font-size: 16px; font-weight: 700; color: #0f172a;">Blue</span><span style="font-size: 16px; font-weight: 700; color: #2563eb;">Drum</span><span style="font-size: 16px; font-weight: 700; color: #0f172a;">AI</span>
      </a>
    </td>
  </tr>

  <!-- Main Card -->
  <tr>
    <td style="background-color: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden;">
      ${content}
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding: 32px 20px; text-align: center;">
      <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">
        <span>Blue</span><span style="color: #2563eb;">Drum</span><span>AI</span>
      </p>
      <p style="margin: 6px 0 0; font-size: 12px; color: #64748b;">
        Structured documentation for life's sensitive moments.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 16px auto 0;">
        <tr>
          <td style="padding: 0 8px;"><a href="${APP_URL}/dashboard" style="font-size: 12px; color: #2563eb; text-decoration: none; font-weight: 500;">Dashboard</a></td>
          <td style="color: #cbd5e1; font-size: 12px;">|</td>
          <td style="padding: 0 8px;"><a href="${APP_URL}/dashboard/subscription" style="font-size: 12px; color: #2563eb; text-decoration: none; font-weight: 500;">Subscription</a></td>
          <td style="color: #cbd5e1; font-size: 12px;">|</td>
          <td style="padding: 0 8px;"><a href="${APP_URL}/dashboard/profile" style="font-size: 12px; color: #2563eb; text-decoration: none; font-weight: 500;">Settings</a></td>
        </tr>
      </table>
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">This platform provides documentation tools only and does not offer legal advice.</p>
        <p style="margin: 8px 0 0; font-size: 11px; color: #cbd5e1;">&copy; ${new Date().getFullYear()} BlueDrumAI. All rights reserved.</p>
      </div>
    </td>
  </tr>

</table>
</td>
</tr>
</table>
</body>
</html>`
}

function buildWelcomePremiumEmail(name: string): string {
  return emailShell(`
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 32px 32px 24px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 999px; padding: 4px 14px; margin-bottom: 16px;">
              <span style="font-size: 12px; font-weight: 600; color: #059669;">&#10003; Premium Active</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
              Welcome to Premium, ${name}!
            </h1>
            <p style="margin: 10px 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
              Your account has been upgraded. Here&rsquo;s what you&rsquo;ve unlocked:
            </p>
          </td>
        </tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 28px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 12px; margin-bottom: 8px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="28" style="font-size: 16px;">&#128274;</td>
                      <td style="font-size: 14px; font-weight: 600; color: #0f172a;">Unlimited evidence uploads</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr><td height="8"></td></tr>
              <tr>
                <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="28" style="font-size: 16px;">&#129504;</td>
                      <td style="font-size: 14px; font-weight: 600; color: #0f172a;">Unlimited AI conversation analyses</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr><td height="8"></td></tr>
              <tr>
                <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="28" style="font-size: 16px;">&#128200;</td>
                      <td style="font-size: 14px; font-weight: 600; color: #0f172a;">Full financial tracking &amp; affidavits</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr><td height="8"></td></tr>
              <tr>
                <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="28" style="font-size: 16px;">&#128196;</td>
                      <td style="font-size: 14px; font-weight: 600; color: #0f172a;">PDF case file exports</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr><td height="8"></td></tr>
              <tr>
                <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="28" style="font-size: 16px;">&#9889;</td>
                      <td style="font-size: 14px; font-weight: 600; color: #0f172a;">Priority processing &amp; support</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding: 0 32px 32px;">
            <a href="${APP_URL}/dashboard" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 10px; line-height: 1;">
              Go to Dashboard &rarr;
            </a>
          </td>
        </tr>
      </table>`)
}

function buildPaymentFailedEmail(name: string): string {
  return emailShell(`
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 32px 32px 24px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: inline-block; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 999px; padding: 4px 14px; margin-bottom: 16px;">
              <span style="font-size: 12px; font-weight: 600; color: #dc2626;">&#9888; Action Needed</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
              ${name}, your payment didn&rsquo;t go through
            </h1>
            <p style="margin: 10px 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
              We couldn&rsquo;t process your latest Premium payment. Your account is still active for now, but please update your payment method to avoid losing access.
            </p>
          </td>
        </tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 28px 32px;">
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 14px; padding: 20px;">
              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 0.6px;">
                What happens next
              </p>
              <p style="margin: 0; font-size: 14px; color: #0f172a; line-height: 1.6;">
                Razorpay will retry the payment automatically. If it fails again, your Premium features &mdash; including unlimited uploads, AI analysis, and PDF exports &mdash; will be paused until payment is resolved.
              </p>
            </div>
          </td>
        </tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding: 0 32px 16px;">
            <a href="${APP_URL}/dashboard/subscription" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 10px; line-height: 1;">
              Update Payment Method &rarr;
            </a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 32px 32px;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">Your data is safe and encrypted regardless of subscription status.</p>
          </td>
        </tr>
      </table>`)
}

function buildSubscriptionExpiredEmail(name: string): string {
  return emailShell(`
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 32px 32px 24px; border-bottom: 1px solid #f1f5f9;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
              ${name}, your Premium plan has ended
            </h1>
            <p style="margin: 10px 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
              Your subscription has expired and your account is now on the Free plan. Your existing data is safe &mdash; nothing has been deleted.
            </p>
          </td>
        </tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 28px 32px;">
            <p style="margin: 0 0 16px; font-size: 13px; font-weight: 600; color: #0f172a;">What changes on the Free plan:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding: 10px 16px; background-color: #f8fafc; border-radius: 10px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="24" style="font-size: 14px; color: #dc2626;">&#10007;</td>
                      <td style="font-size: 13px; color: #334155;">Upload limit: 5 files per month</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr><td height="6"></td></tr>
              <tr>
                <td style="padding: 10px 16px; background-color: #f8fafc; border-radius: 10px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="24" style="font-size: 14px; color: #dc2626;">&#10007;</td>
                      <td style="font-size: 13px; color: #334155;">AI analysis: 3 conversations per month</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr><td height="6"></td></tr>
              <tr>
                <td style="padding: 10px 16px; background-color: #f8fafc; border-radius: 10px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="24" style="font-size: 14px; color: #dc2626;">&#10007;</td>
                      <td style="font-size: 13px; color: #334155;">PDF exports paused</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <div style="margin-top: 20px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 14px; padding: 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="24" style="font-size: 16px; vertical-align: top; padding-top: 2px;">&#128274;</td>
                  <td style="font-size: 13px; color: #065f46; line-height: 1.6;">
                    <strong>Your data is safe.</strong> All uploaded evidence, analyses, and financial records remain encrypted and accessible on the Free plan.
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding: 0 32px 32px;">
            <a href="${APP_URL}/dashboard/subscription" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 10px; line-height: 1;">
              Resubscribe to Premium &rarr;
            </a>
            <p style="margin: 12px 0 0; font-size: 12px; color: #94a3b8;">Just &#8377;199/month &mdash; cancel anytime</p>
          </td>
        </tr>
      </table>`)
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

  // Fetch user info for emails (non-blocking — don't let email failures break webhook)
  const { data: userData } = await db
    .from('users')
    .select('email, first_name')
    .eq('id', sub.user_id)
    .single()
  const userName = userData?.first_name || 'there'
  const userEmail = userData?.email

  if (eventType === 'subscription.activated' || eventType === 'subscription.charged') {
    const entity = event.payload.subscription.entity
    await db.from('subscriptions').update({
      plan: 'premium',
      status: 'active',
      current_period_start: entity.current_start ? new Date(entity.current_start * 1000).toISOString() : undefined,
      current_period_end: entity.current_end ? new Date(entity.current_end * 1000).toISOString() : undefined,
    }).eq('user_id', sub.user_id)

    if (eventType === 'subscription.activated' && userEmail) {
      sendEmail(userEmail, `Welcome to Premium, ${userName}! Here's what you unlocked`, buildWelcomePremiumEmail(userName))
    }
  }

  if (eventType === 'subscription.halted' || eventType === 'subscription.pending') {
    await db.from('subscriptions').update({
      status: 'past_due',
    }).eq('user_id', sub.user_id)

    if (userEmail) {
      sendEmail(userEmail, `Action needed: Your BlueDrumAI payment didn't go through`, buildPaymentFailedEmail(userName))
    }
  }

  if (eventType === 'subscription.cancelled' || eventType === 'subscription.completed') {
    await db.from('subscriptions').update({
      plan: 'free',
      status: 'expired',
      cancelled_at: new Date().toISOString(),
    }).eq('user_id', sub.user_id)

    if (userEmail) {
      sendEmail(userEmail, `Your Premium plan has ended — your data is safe`, buildSubscriptionExpiredEmail(userName))
    }
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
