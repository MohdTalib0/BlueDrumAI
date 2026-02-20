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
        .select('id, email, first_name, last_name, gender, relationship_status, onboarding_completed, login_count, created_at')
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

