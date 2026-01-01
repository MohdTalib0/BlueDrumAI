import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { sanitizeEmail, sanitizeAnswers, sanitizeManualInput } from '../_shared/sanitize.ts'
import { generateRiskCheckAdvice } from '../_shared/ai.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Simple in-memory rate limiting (for edge functions)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient(req)
    // Helper to log AI usage (risk-check is unauthenticated; user_id null)
    async function logAiUsage(opts: {
      provider?: string
      model?: string
      inputTokens?: number
      outputTokens?: number
      responseTimeMs?: number
      serviceType?: string
      resourceType?: string
      resourceId?: string
    }) {
      try {
        await supabase.from('ai_usage_logs').insert({
          user_id: null,
          provider: opts.provider || null,
          model: opts.model || null,
          input_tokens: opts.inputTokens ?? 0,
          output_tokens: opts.outputTokens ?? 0,
          total_tokens: (opts.inputTokens ?? 0) + (opts.outputTokens ?? 0),
          response_time_ms: opts.responseTimeMs ?? null,
          service_type: opts.serviceType || 'risk_check',
          resource_type: opts.resourceType || 'risk_check',
          resource_id: opts.resourceId || null,
          input_cost: null,
          output_cost: null,
          total_cost: null,
        })
      } catch (e) {
        console.warn('Failed to log AI usage (risk-check)', e)
      }
    }
    const body = await req.json()
    const { email, gender, answers, manualInput } = body

    // Validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['male', 'female'].includes(gender)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid gender' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!answers || typeof answers !== 'object') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid answers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting (3 per 24 hours per email)
    const rateLimitKey = `risk-check:${email.toLowerCase().trim()}`
    if (!checkRateLimit(rateLimitKey, 3, 24 * 60 * 60 * 1000)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Rate limit exceeded',
          message: 'Maximum 3 risk checks per email per 24 hours. Please try again later.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Additional DB check for rate limiting
    const sanitizedEmail = sanitizeEmail(email)
    const { data: recentChecks } = await supabase
      .from('risk_checks')
      .select('id')
      .eq('email', sanitizedEmail)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(3)

    if (recentChecks && recentChecks.length >= 3) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Rate limit exceeded',
          message: 'Maximum 3 risk checks per email per 24 hours. Please try again later.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize inputs
    const sanitizedGender = gender as 'male' | 'female'
    const sanitizedAnswers = sanitizeAnswers(answers)
    const sanitizedManualInput = sanitizeManualInput(manualInput)

    // Generate AI response
    const { response: aiResponse, usage } = await generateRiskCheckAdvice({
      gender: sanitizedGender,
      answers: sanitizedAnswers,
      manualInput: sanitizedManualInput || undefined,
    })
    // Log AI usage (no token data available from this path)
    await logAiUsage({
      serviceType: 'risk_check',
      resourceType: 'risk_check',
      provider: usage?.provider,
      model: usage?.model,
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      responseTimeMs: usage?.responseTimeMs,
    })

    // Store in database
    const { data: riskCheck, error: dbError } = await supabase
      .from('risk_checks')
      .insert({
        email: sanitizedEmail,
        gender: sanitizedGender,
        answers: sanitizedAnswers,
        manual_input: sanitizedManualInput,
        ai_response: aiResponse,
        risk_score: aiResponse.riskScore,
        readiness_score: aiResponse.readinessScore,
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('Failed to save risk check:', dbError)
      // Still return AI response even if DB save fails
    }

    // Update waitlist
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               null
    const userAgent = req.headers.get('user-agent')?.slice(0, 512) || null

    const { data: existingWaitlist } = await supabase
      .from('waitlist')
      .select('risk_check_id, source, sources, meta, ip, user_agent')
      .eq('email', sanitizedEmail)
      .single()

    const existingMeta = (existingWaitlist?.meta as Record<string, unknown>) || {}
    const existingRiskCheckIds = (existingMeta.risk_check_ids as string[]) || []
    const updatedRiskCheckIds = riskCheck?.id
      ? [...existingRiskCheckIds, riskCheck.id]
      : existingRiskCheckIds

    const existingSources = (existingWaitlist?.sources as string[]) || []
    const sourceToAdd = 'risk_calculator'
    const updatedSources = existingSources.includes(sourceToAdd)
      ? existingSources
      : [...existingSources, sourceToAdd]

    await supabase
      .from('waitlist')
      .upsert(
        [
          {
            email: sanitizedEmail,
            interest: sanitizedGender === 'male' ? 'male' : 'female',
            source: existingWaitlist?.source || sourceToAdd,
            sources: updatedSources,
            last_source: sourceToAdd,
            risk_check_id: riskCheck?.id || existingWaitlist?.risk_check_id || null,
            ip: ip || existingWaitlist?.ip || null,
            user_agent: userAgent || existingWaitlist?.user_agent || null,
            meta: {
              ...existingMeta,
              risk_check_ids: updatedRiskCheckIds,
              latest_risk_check_id: riskCheck?.id,
            },
          },
        ],
        { onConflict: 'email' }
      )
      .then(() => {}) // Ignore errors

    return new Response(
      JSON.stringify({
        ok: true,
        ...aiResponse,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Risk check function error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
