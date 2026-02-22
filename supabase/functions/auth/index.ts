import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { verifyAuth } from '../_shared/auth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    
    // GET /me - Get current user profile
    if (url.pathname.endsWith('/me') && req.method === 'GET') {
      const { user, error } = await verifyAuth(req)
      if (error || !user) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabase = createSupabaseClient(req)
      const { data, error: dbError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, gender, relationship_status, onboarding_completed, login_count, role, created_at')
        .eq('id', user.id)
        .single()

      if (dbError || !data) {
        return new Response(
          JSON.stringify({ ok: false, error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, user: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH /me - Update user profile
    if (url.pathname.endsWith('/me') && req.method === 'PATCH') {
      const { user, error } = await verifyAuth(req)
      if (error || !user) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json()

      // Whitelist: only allow safe, user-editable profile fields
      const ALLOWED_FIELDS = ['first_name', 'last_name', 'gender', 'relationship_status', 'onboarding_completed'] as const
      const sanitized: Record<string, unknown> = {}

      for (const key of ALLOWED_FIELDS) {
        if (key in body && body[key] !== undefined) {
          sanitized[key] = body[key]
        }
      }

      if (Object.keys(sanitized).length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No valid fields to update. Allowed: ' + ALLOWED_FIELDS.join(', ') }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate enum fields
      if (sanitized.gender && !['male', 'female', 'both'].includes(sanitized.gender as string)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid gender value. Allowed: male, female, both' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (sanitized.relationship_status && !['single', 'dating', 'live_in', 'married', 'separated', 'divorced'].includes(sanitized.relationship_status as string)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid relationship_status. Allowed: single, dating, live_in, married, separated, divorced' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (sanitized.onboarding_completed !== undefined && typeof sanitized.onboarding_completed !== 'boolean') {
        return new Response(
          JSON.stringify({ ok: false, error: 'onboarding_completed must be a boolean' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // String length validation for name fields
      if (sanitized.first_name && (typeof sanitized.first_name !== 'string' || (sanitized.first_name as string).length > 100)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'first_name must be a string (max 100 chars)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (sanitized.last_name && (typeof sanitized.last_name !== 'string' || (sanitized.last_name as string).length > 100)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'last_name must be a string (max 100 chars)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabase = createSupabaseClient(req)

      const { data, error: updateError } = await supabase
        .from('users')
        .update(sanitized)
        .eq('id', user.id)
        .select('id, created_at')
        .single()

      if (updateError) {
        return new Response(
          JSON.stringify({ ok: false, error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, user: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /session — Record login activity, update tracking fields, create session record
    if (url.pathname.endsWith('/session') && req.method === 'POST') {
      const { user, error } = await verifyAuth(req)
      if (error || !user) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabase = createSupabaseClient(req)

      // Parse optional attribution from body
      let attribution: Record<string, string | null> | null = null
      try {
        const body = await req.json()
        attribution = body?.attribution || null
      } catch { /* no body or invalid JSON */ }

      // Read current user fields to handle first-time attribution + login_count
      const { data: current } = await supabase
        .from('users')
        .select('login_count, source, referrer, utm_source, utm_medium, utm_campaign')
        .eq('id', user.id)
        .single()

      const now = new Date().toISOString()
      const updatePayload: Record<string, unknown> = {
        last_login_at: now,
        last_activity_at: now,
        login_count: (current?.login_count || 0) + 1,
        email_verified: true,
        is_active: true,
      }

      // Only set attribution fields if they're currently null (preserve first-touch)
      if (attribution) {
        if (!current?.source && attribution.source)
          updatePayload.source = attribution.source
        if (!current?.referrer && attribution.referrer)
          updatePayload.referrer = attribution.referrer
        if (!current?.utm_source && attribution.utm_source)
          updatePayload.utm_source = attribution.utm_source
        if (!current?.utm_medium && attribution.utm_medium)
          updatePayload.utm_medium = attribution.utm_medium
        if (!current?.utm_campaign && attribution.utm_campaign)
          updatePayload.utm_campaign = attribution.utm_campaign
      }

      await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', user.id)

      // Extract IP and User-Agent
      const forwarded = req.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0].trim() : (req.headers.get('x-real-ip') || null)
      const userAgent = req.headers.get('user-agent') || ''

      // Basic User-Agent parsing
      const deviceInfo: Record<string, string> = { device_type: 'Desktop', browser: 'Unknown', os: 'Unknown' }
      if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
        deviceInfo.device_type = /iPad|Tablet/i.test(userAgent) ? 'Tablet' : 'Mobile'
      }
      if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) deviceInfo.browser = 'Chrome'
      else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) deviceInfo.browser = 'Safari'
      else if (/Firefox/i.test(userAgent)) deviceInfo.browser = 'Firefox'
      else if (/Edg/i.test(userAgent)) deviceInfo.browser = 'Edge'
      else if (/Opera|OPR/i.test(userAgent)) deviceInfo.browser = 'Opera'

      if (/Windows/i.test(userAgent)) deviceInfo.os = 'Windows'
      else if (/Mac OS|Macintosh/i.test(userAgent)) deviceInfo.os = 'macOS'
      else if (/Android/i.test(userAgent)) deviceInfo.os = 'Android'
      else if (/iPhone|iPad|iOS/i.test(userAgent)) deviceInfo.os = 'iOS'
      else if (/Linux/i.test(userAgent)) deviceInfo.os = 'Linux'

      // IP geolocation (best-effort, non-blocking)
      let locationInfo: Record<string, string> | null = null
      if (ip && ip !== '127.0.0.1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
        try {
          const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName,timezone`)
          if (geoRes.ok) {
            const geo = await geoRes.json()
            if (geo.status === 'success') {
              locationInfo = {
                country: geo.country,
                country_code: geo.countryCode,
                city: geo.city,
                region: geo.regionName,
                timezone: geo.timezone,
              }
            }
          }
        } catch {
          // Geolocation failed — proceed without it
        }
      }

      // Mark any existing active sessions for this user as inactive
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true)

      // Create new session record
      await supabase.from('user_sessions').insert({
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        device_info: deviceInfo,
        location_info: locationInfo,
        is_active: true,
      })

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /feedback — Submit user feedback
    if (url.pathname.endsWith('/feedback') && req.method === 'POST') {
      const { user, error: authErr } = await verifyAuth(req)
      if (authErr || !user) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let body: any
      try {
        body = await req.json()
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { type, title, description } = body

      const VALID_TYPES = ['bug', 'feature', 'improvement', 'other']
      if (!type || !VALID_TYPES.includes(type)) {
        return new Response(
          JSON.stringify({ ok: false, error: `type must be one of: ${VALID_TYPES.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
        return new Response(
          JSON.stringify({ ok: false, error: 'title must be between 3 and 200 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!description || typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 5000) {
        return new Response(
          JSON.stringify({ ok: false, error: 'description must be between 10 and 5000 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabase = createSupabaseClient(req)
      const { error: insertErr } = await supabase.from('feedback').insert({
        user_id: user.id,
        type: type.trim(),
        title: title.trim(),
        description: description.trim(),
      })

      if (insertErr) {
        console.error('Feedback insert error:', insertErr)
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to save feedback' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Auth function error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

