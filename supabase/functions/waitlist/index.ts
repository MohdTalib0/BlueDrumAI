import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { sanitizeEmail } from '../_shared/sanitize.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient(req)
    const { email, interest, source, meta } = await req.json()

    // Validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['male', 'female', 'both'].includes(interest)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid interest' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(email)
    const sanitizedSource = (source || 'landing_page').slice(0, 64)
    const sanitizedMeta = meta || null

    // Get IP and User Agent
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = req.headers.get('user-agent')?.slice(0, 512) || null

    // Check if entry already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('risk_check_id, source, sources, last_source, meta')
      .eq('email', sanitizedEmail)
      .single()

    // Track sources in chronological order
    const existingSources = (existing?.sources as string[]) || []
    const firstSource = existing?.source || sanitizedSource
    const newSources = existing
      ? existingSources.includes(sanitizedSource)
        ? existingSources
        : [...existingSources, sanitizedSource]
      : [sanitizedSource]

    // Merge metadata
    const existingMeta = (existing?.meta as Record<string, unknown>) || {}
    const existingRiskCheckIds = (existingMeta.risk_check_ids as string[]) || []
    const newMeta: Record<string, unknown> = {
      ...existingMeta,
      ...(sanitizedMeta || {}),
    }
    if (existingRiskCheckIds.length > 0) {
      newMeta.risk_check_ids = existingRiskCheckIds
    }
    Object.keys(newMeta).forEach((key) => {
      if (newMeta[key] === undefined) delete newMeta[key]
    })

    // Upsert to database
    const { error } = await supabase
      .from('waitlist')
      .upsert(
        [
          {
            email: sanitizedEmail,
            interest,
            source: firstSource,
            sources: newSources,
            last_source: sanitizedSource,
            risk_check_id: existing?.risk_check_id || null,
            ip,
            user_agent: userAgent,
            meta: newMeta,
          },
        ],
        { onConflict: 'email' }
      )

    if (error) {
      console.error('Waitlist upsert error:', error)
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to save signup' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Waitlist function error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
