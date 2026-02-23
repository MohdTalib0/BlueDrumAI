import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Blue Drum AI <noreply@bluedrumai.com>'
const APP_URL = Deno.env.get('APP_URL') || 'https://beta.bluedrumai.com'

interface UserProgress {
  id: string
  email: string
  first_name: string | null
  vault_count: number
  analysis_count: number
  income_count: number
  readiness_score: number
}

function buildEmailHtml(user: UserProgress): string {
  const name = user.first_name || 'there'
  const missing: string[] = []

  if (user.vault_count === 0) missing.push('Upload your first piece of evidence')
  if (user.analysis_count === 0) missing.push('Analyze a conversation with AI')
  if (user.income_count === 0) missing.push('Log your income & expenses')

  const nextStep = missing[0] || 'Export your case file as PDF'
  const nextStepUrl = missing.length > 0
    ? user.vault_count === 0 ? `${APP_URL}/dashboard/vault/upload`
    : user.analysis_count === 0 ? `${APP_URL}/dashboard/red-flag-radar`
    : `${APP_URL}/dashboard/income-tracker`
    : `${APP_URL}/dashboard/vault/timeline`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Case File Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <img src="${APP_URL}/logo.svg" alt="Blue Drum AI" width="40" height="40" style="display: block;">
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">

              <!-- Header -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 28px 28px 20px; border-bottom: 1px solid #f1f5f9;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a;">
                      Hi ${name}, here's your weekly update
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                      Your case file status as of this week.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Stats Grid -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 24px 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="33%" style="text-align: center; padding: 12px; background-color: #f8fafc; border-radius: 12px;">
                          <div style="font-size: 28px; font-weight: 800; color: #0f172a;">${user.vault_count}</div>
                          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Evidence Files</div>
                        </td>
                        <td width="8"></td>
                        <td width="33%" style="text-align: center; padding: 12px; background-color: #f8fafc; border-radius: 12px;">
                          <div style="font-size: 28px; font-weight: 800; color: #0f172a;">${user.analysis_count}</div>
                          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Chats Analyzed</div>
                        </td>
                        <td width="8"></td>
                        <td width="33%" style="text-align: center; padding: 12px; background-color: #f8fafc; border-radius: 12px;">
                          <div style="font-size: 28px; font-weight: 800; color: #0f172a;">${user.income_count}</div>
                          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Financial Records</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Readiness Score -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 0 28px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 8px;">
                      <tr>
                        <td style="font-size: 13px; font-weight: 600; color: #0f172a;">Case Readiness</td>
                        <td align="right" style="font-size: 13px; font-weight: 700; color: #3b82f6;">${user.readiness_score}/100</td>
                      </tr>
                    </table>
                    <div style="height: 8px; background-color: #e2e8f0; border-radius: 999px; overflow: hidden;">
                      <div style="height: 100%; width: ${user.readiness_score}%; background: linear-gradient(90deg, #3b82f6, #10b981); border-radius: 999px;"></div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Next Step -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 0 28px 28px;">
                    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px;">
                      <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px;">
                        Suggested Next Step
                      </p>
                      <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1e3a5f;">
                        ${nextStep}
                      </p>
                      <a href="${nextStepUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 8px;">
                        Do it now →
                      </a>
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                Blue Drum AI — Organize your evidence. Strengthen your case.
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #cbd5e1;">
                Not legal advice. For documentation purposes only.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('onboarding_completed', true)
      .not('email', 'is', null)

    if (usersError) throw usersError

    let sent = 0
    let errors = 0

    for (const user of users || []) {
      try {
        const [vaultRes, analysisRes, incomeRes] = await Promise.allSettled([
          supabase.from('vault_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('chat_analyses').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('income_tracker').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        ])

        const vaultCount = vaultRes.status === 'fulfilled' ? (vaultRes.value.count || 0) : 0
        const analysisCount = analysisRes.status === 'fulfilled' ? (analysisRes.value.count || 0) : 0
        const incomeCount = incomeRes.status === 'fulfilled' ? (incomeRes.value.count || 0) : 0

        let score = 0
        if (vaultCount > 0) score += 25
        if (vaultCount >= 5) score += 10
        if (analysisCount > 0) score += 25
        if (analysisCount >= 3) score += 10
        if (incomeCount > 0) score += 20
        if (incomeCount >= 3) score += 10

        const progress: UserProgress = {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          vault_count: vaultCount,
          analysis_count: analysisCount,
          income_count: incomeCount,
          readiness_score: Math.min(score, 100),
        }

        const html = buildEmailHtml(progress)

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [user.email],
            subject: `Your case file: ${progress.readiness_score}/100 ready — here's what's next`,
            html,
          }),
        })

        if (!emailRes.ok) {
          const errBody = await emailRes.text().catch(() => 'unknown')
          console.error(`Failed to send to ${user.email}: ${emailRes.status} ${errBody}`)
          errors++
        } else {
          sent++
        }
      } catch (err) {
        console.error(`Error processing user ${user.id}:`, err)
        errors++
      }
    }

    return new Response(JSON.stringify({ sent, errors, total: users?.length || 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Weekly progress error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
