import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { getUserId } from '../_shared/auth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userId = await getUserId(req)
    if (!userId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const supabase = createSupabaseClient(req)

    // ── DOWRY ENTRIES ──

    // GET /entries - List all dowry entries
    if (url.pathname.endsWith('/entries') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('dowry_entries')
        .select('id, user_id, item_description, value, gift_date, transfer_type, evidence_urls, demand_recordings_url, witnesses, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, entries: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /entry/:id - Get specific entry
    if (url.pathname.includes('/entry/') && req.method === 'GET') {
      const entryId = url.pathname.split('/entry/')[1]
      const { data, error } = await supabase
        .from('dowry_entries')
        .select('id, user_id, item_description, value, gift_date, transfer_type, evidence_urls, demand_recordings_url, witnesses, created_at, updated_at')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Entry not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, entry: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /entry - Create dowry entry
    if (url.pathname.endsWith('/entry') && req.method === 'POST') {
      const rl = checkRateLimit(userId, 'dowry:write', 20, 60_000)
      if (!rl.allowed) return rateLimitResponse(rl.retryAfter!, corsHeaders)

      let body
      try {
        body = await req.json()
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { item_description, value, gift_date, transfer_type, evidence_urls, demand_recordings_url, witnesses } = body

      if (!item_description || typeof item_description !== 'string' || item_description.trim().length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'item_description is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const validTypes = ['cash', 'bank_transfer', 'jewelry', 'appliances', 'vehicle', 'property', 'other']
      if (transfer_type && !validTypes.includes(transfer_type)) {
        return new Response(
          JSON.stringify({ ok: false, error: `transfer_type must be one of: ${validTypes.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let parsedValue: number | null = null
      if (value != null && value !== '') {
        parsedValue = typeof value === 'number' ? value : parseFloat(value)
        if (isNaN(parsedValue) || parsedValue < 0) {
          return new Response(
            JSON.stringify({ ok: false, error: 'value must be a non-negative number' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      const { data, error } = await supabase
        .from('dowry_entries')
        .insert({
          user_id: userId,
          item_description: item_description.trim(),
          value: parsedValue,
          gift_date: gift_date || null,
          transfer_type: transfer_type || null,
          evidence_urls: Array.isArray(evidence_urls) ? evidence_urls : [],
          demand_recordings_url: Array.isArray(demand_recordings_url) ? demand_recordings_url : [],
          witnesses: Array.isArray(witnesses) ? witnesses : [],
        })
        .select('id, created_at')
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, entry: data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH /entry/:id - Update dowry entry
    if (url.pathname.includes('/entry/') && req.method === 'PATCH') {
      const rl = checkRateLimit(userId, 'dowry:write', 20, 60_000)
      if (!rl.allowed) return rateLimitResponse(rl.retryAfter!, corsHeaders)

      const entryId = url.pathname.split('/entry/')[1]
      let body
      try {
        body = await req.json()
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const allowedFields = ['item_description', 'value', 'gift_date', 'transfer_type', 'evidence_urls', 'demand_recordings_url', 'witnesses']
      const sanitized: Record<string, unknown> = {}
      for (const key of allowedFields) {
        if (key in body) sanitized[key] = body[key]
      }

      if (sanitized.value != null && sanitized.value !== '') {
        const v = typeof sanitized.value === 'number' ? sanitized.value : parseFloat(String(sanitized.value))
        if (isNaN(v) || v < 0) {
          return new Response(
            JSON.stringify({ ok: false, error: 'value must be a non-negative number' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        sanitized.value = v
      }

      if (Object.keys(sanitized).length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No valid fields to update' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('dowry_entries')
        .update(sanitized)
        .eq('id', entryId)
        .eq('user_id', userId)
        .select('id, created_at')
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, entry: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /entry/:id - Delete dowry entry
    if (url.pathname.includes('/entry/') && req.method === 'DELETE') {
      const entryId = url.pathname.split('/entry/')[1]

      const { error } = await supabase
        .from('dowry_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId)

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── WITNESSES ──

    // GET /witnesses - List all witnesses
    if (url.pathname.endsWith('/witnesses') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('dowry_witnesses')
        .select('id, name, phone, email, relationship, address, notes, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, witnesses: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /witness - Add witness
    if (url.pathname.endsWith('/witness') && req.method === 'POST') {
      const rl = checkRateLimit(userId, 'dowry:write', 20, 60_000)
      if (!rl.allowed) return rateLimitResponse(rl.retryAfter!, corsHeaders)

      let body
      try {
        body = await req.json()
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { name, phone, email, relationship, address, notes } = body

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Witness name is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const validRelationships = ['family', 'friend', 'neighbor', 'colleague', 'relative', 'other']
      if (relationship && !validRelationships.includes(relationship)) {
        return new Response(
          JSON.stringify({ ok: false, error: `relationship must be one of: ${validRelationships.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('dowry_witnesses')
        .insert({
          user_id: userId,
          name: name.trim(),
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          relationship: relationship || null,
          address: address?.trim() || null,
          notes: notes?.trim() || null,
        })
        .select('id, created_at')
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, witness: data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /witness/:id - Delete witness
    if (url.pathname.includes('/witness/') && req.method === 'DELETE') {
      const witnessId = url.pathname.split('/witness/')[1]

      const { error } = await supabase
        .from('dowry_witnesses')
        .delete()
        .eq('id', witnessId)
        .eq('user_id', userId)

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── SUMMARY ──

    // GET /summary - Aggregated dowry summary
    if (url.pathname.endsWith('/summary') && req.method === 'GET') {
      const [entriesResult, witnessesResult] = await Promise.all([
        supabase
          .from('dowry_entries')
          .select('id, value, transfer_type, gift_date, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('dowry_witnesses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ])

      if (entriesResult.error) {
        return new Response(
          JSON.stringify({ ok: false, error: entriesResult.error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const entries = entriesResult.data || []
      const totalValue = entries.reduce((sum, e) => sum + parseFloat(String(e.value || 0)), 0)

      const byType: Record<string, { count: number; value: number }> = {}
      for (const e of entries) {
        const t = e.transfer_type || 'other'
        if (!byType[t]) byType[t] = { count: 0, value: 0 }
        byType[t].count++
        byType[t].value += parseFloat(String(e.value || 0))
      }

      return new Response(
        JSON.stringify({
          ok: true,
          summary: {
            totalEntries: entries.length,
            totalValue,
            totalWitnesses: witnessesResult.count ?? 0,
            byType,
            latestEntry: entries[0] || null,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Dowry function error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
