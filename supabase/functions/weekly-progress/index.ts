import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Blue Drum AI <noreply@mail.bluedrumai.com>'
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

  const scoreColor = user.readiness_score >= 70 ? '#10b981' : user.readiness_score >= 40 ? '#f59e0b' : '#2563eb'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your BlueDrumAI Weekly Preparedness Update</title>
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
        <span style="font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">Blue</span><span style="font-size: 16px; font-weight: 700; color: #2563eb; letter-spacing: -0.3px;">Drum</span><span style="font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">AI</span>
      </a>
    </td>
  </tr>

  <!-- Main Card -->
  <tr>
    <td style="background-color: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden;">

      <!-- Header -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 32px 32px 24px; border-bottom: 1px solid #f1f5f9;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
              Hi ${name}, here's your weekly preparedness summary
            </h1>
            <p style="margin: 10px 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
              A snapshot of the records and documentation you've structured inside BlueDrumAI this week.
            </p>
          </td>
        </tr>
      </table>

      <!-- Stats Section -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 28px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="33%" style="text-align: center; padding: 16px 8px; background-color: #f8fafc; border-radius: 14px;">
                  <div style="font-size: 30px; font-weight: 800; color: #0f172a;">${user.vault_count}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 6px; font-weight: 500;">Stored Records</div>
                </td>
                <td width="10"></td>
                <td width="33%" style="text-align: center; padding: 16px 8px; background-color: #f8fafc; border-radius: 14px;">
                  <div style="font-size: 30px; font-weight: 800; color: #0f172a;">${user.analysis_count}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 6px; font-weight: 500;">Communication Reviews</div>
                </td>
                <td width="10"></td>
                <td width="33%" style="text-align: center; padding: 16px 8px; background-color: #f8fafc; border-radius: 14px;">
                  <div style="font-size: 30px; font-weight: 800; color: #0f172a;">${user.income_count}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 6px; font-weight: 500;">Financial Entries</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Readiness Score -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 0 32px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 10px;">
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #0f172a;">Documentation Readiness</td>
                <td align="right" style="font-size: 14px; font-weight: 700; color: ${scoreColor};">${user.readiness_score}/100</td>
              </tr>
            </table>
            <div style="height: 10px; background-color: #e2e8f0; border-radius: 999px; overflow: hidden;">
              <div style="height: 100%; width: ${user.readiness_score}%; background: linear-gradient(90deg, #2563eb, #10b981); border-radius: 999px;"></div>
            </div>
            <p style="margin: 10px 0 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
              Reflects how structured and complete your documentation is. A higher score means stronger organization.
            </p>
          </td>
        </tr>
      </table>

      <!-- Divider -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding: 0 32px;"><div style="height: 1px; background-color: #f1f5f9;"></div></td></tr>
      </table>

      <!-- Recommended Action -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 28px 32px 32px;">
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 20px;">
              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.6px;">
                Recommended Action
              </p>
              <p style="margin: 0 0 16px; font-size: 15px; font-weight: 600; color: #0f172a; line-height: 1.5;">
                ${nextStep}
              </p>
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${nextStepUrl}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="23%" fillcolor="#2563eb" stroke="f">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;">Strengthen My Record &rarr;</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${nextStepUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 10px; line-height: 1;">
                Strengthen My Record &rarr;
              </a>
              <!--<![endif]-->
            </div>
          </td>
        </tr>
      </table>

      <!-- Reinforcement -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 0 32px 32px;">
            <div style="background-color: #f8fafc; border-radius: 14px; padding: 18px;">
              <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.7;">
                BlueDrumAI helps you organize timelines, preserve records, and maintain structured documentation &mdash; so important details remain clear and accessible if disputes arise in the future.
              </p>
            </div>
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding: 32px 20px; text-align: center;">
      <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">
        <span>Blue</span><span style="color: #2563eb;">Drum</span><span>AI</span>
      </p>
      <p style="margin: 6px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        Structured documentation for life's sensitive moments.
      </p>

      <!-- Footer Links -->
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 16px auto 0;">
        <tr>
          <td style="padding: 0 8px;">
            <a href="${APP_URL}/dashboard" style="font-size: 12px; color: #2563eb; text-decoration: none; font-weight: 500;">Dashboard</a>
          </td>
          <td style="color: #cbd5e1; font-size: 12px;">|</td>
          <td style="padding: 0 8px;">
            <a href="${APP_URL}/dashboard/vault/upload" style="font-size: 12px; color: #2563eb; text-decoration: none; font-weight: 500;">Upload</a>
          </td>
          <td style="color: #cbd5e1; font-size: 12px;">|</td>
          <td style="padding: 0 8px;">
            <a href="${APP_URL}/dashboard/profile" style="font-size: 12px; color: #2563eb; text-decoration: none; font-weight: 500;">Settings</a>
          </td>
        </tr>
      </table>

      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.6;">
          This platform provides documentation tools only and does not offer legal advice.
        </p>
        <p style="margin: 8px 0 0; font-size: 11px; color: #cbd5e1;">
          &copy; ${new Date().getFullYear()} BlueDrumAI. All rights reserved.
        </p>
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
