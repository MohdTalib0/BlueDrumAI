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

    // ── INCIDENTS ──

    // GET /incidents - List all incidents
    if (url.pathname.endsWith('/incidents') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('dv_incidents')
        .select('id, incident_date, incident_type, description, location, evidence_urls, medical_report_url, police_complaint_url, witnesses, created_at')
        .eq('user_id', userId)
        .order('incident_date', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, incidents: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /incident/:id - Get specific incident
    if (url.pathname.includes('/incident/') && req.method === 'GET') {
      const incidentId = url.pathname.split('/incident/')[1]
      const { data, error } = await supabase
        .from('dv_incidents')
        .select('id, incident_date, incident_type, description, location, evidence_urls, medical_report_url, police_complaint_url, witnesses, created_at, updated_at')
        .eq('id', incidentId)
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Incident not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, incident: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /incident - Log new incident
    if (url.pathname.endsWith('/incident') && req.method === 'POST') {
      const rl = checkRateLimit(userId, 'dv:write', 20, 60_000)
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

      const { incident_date, incident_type, description, location, evidence_urls, witnesses } = body

      if (!incident_date || typeof incident_date !== 'string') {
        return new Response(
          JSON.stringify({ ok: false, error: 'incident_date is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const validTypes = ['physical', 'emotional', 'financial', 'sexual', 'threat', 'other']
      if (!incident_type || !validTypes.includes(incident_type)) {
        return new Response(
          JSON.stringify({ ok: false, error: `incident_type must be one of: ${validTypes.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'description is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('dv_incidents')
        .insert({
          user_id: userId,
          incident_date,
          incident_type,
          description: description.trim(),
          location: location?.trim() || null,
          evidence_urls: Array.isArray(evidence_urls) ? evidence_urls : [],
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
        JSON.stringify({ ok: true, incident: data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH /incident/:id - Update incident
    if (url.pathname.includes('/incident/') && req.method === 'PATCH') {
      const rl = checkRateLimit(userId, 'dv:write', 20, 60_000)
      if (!rl.allowed) return rateLimitResponse(rl.retryAfter!, corsHeaders)

      const incidentId = url.pathname.split('/incident/')[1]
      let body
      try {
        body = await req.json()
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const allowedFields = ['incident_date', 'incident_type', 'description', 'location', 'evidence_urls', 'medical_report_url', 'police_complaint_url', 'witnesses']
      const sanitized: Record<string, unknown> = {}
      for (const key of allowedFields) {
        if (key in body) sanitized[key] = body[key]
      }

      if (Object.keys(sanitized).length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No valid fields to update' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const validTypes = ['physical', 'emotional', 'financial', 'sexual', 'threat', 'other']
      if ('incident_type' in sanitized && !validTypes.includes(sanitized.incident_type as string)) {
        return new Response(
          JSON.stringify({ ok: false, error: `incident_type must be one of: ${validTypes.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if ('incident_date' in sanitized && typeof sanitized.incident_date !== 'string') {
        return new Response(
          JSON.stringify({ ok: false, error: 'incident_date must be a valid date string' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if ('description' in sanitized && (typeof sanitized.description !== 'string' || (sanitized.description as string).trim().length === 0)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'description cannot be empty' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('dv_incidents')
        .update(sanitized)
        .eq('id', incidentId)
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
        JSON.stringify({ ok: true, incident: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /incident/:id - Delete incident
    if (url.pathname.includes('/incident/') && req.method === 'DELETE') {
      const incidentId = url.pathname.split('/incident/')[1]

      const { error } = await supabase
        .from('dv_incidents')
        .delete()
        .eq('id', incidentId)
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

    // ── MEDICAL REPORTS ──

    // GET /medical-reports - List all medical reports
    if (url.pathname.endsWith('/medical-reports') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('dv_medical_reports')
        .select('id, incident_id, report_date, hospital_name, doctor_name, diagnosis, file_url, notes, created_at')
        .eq('user_id', userId)
        .order('report_date', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, reports: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /medical-report - Add medical report
    if (url.pathname.endsWith('/medical-report') && req.method === 'POST') {
      const rl = checkRateLimit(userId, 'dv:write', 20, 60_000)
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

      const { incident_id, report_date, hospital_name, doctor_name, diagnosis, file_url, notes } = body

      if (!report_date || typeof report_date !== 'string') {
        return new Response(
          JSON.stringify({ ok: false, error: 'report_date is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!diagnosis || typeof diagnosis !== 'string' || diagnosis.trim().length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'diagnosis is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let verifiedIncidentId: string | null = null
      if (incident_id) {
        const { data: inc } = await supabase
          .from('dv_incidents')
          .select('id')
          .eq('id', incident_id)
          .eq('user_id', userId)
          .single()
        if (!inc) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Linked incident not found or does not belong to you' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        verifiedIncidentId = inc.id
      }

      const { data, error } = await supabase
        .from('dv_medical_reports')
        .insert({
          user_id: userId,
          incident_id: verifiedIncidentId,
          report_date,
          hospital_name: hospital_name?.trim() || null,
          doctor_name: doctor_name?.trim() || null,
          diagnosis: diagnosis.trim(),
          file_url: file_url || null,
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
        JSON.stringify({ ok: true, report: data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /medical-report/:id - Delete medical report
    if (url.pathname.includes('/medical-report/') && req.method === 'DELETE') {
      const reportId = url.pathname.split('/medical-report/')[1]

      const { error } = await supabase
        .from('dv_medical_reports')
        .delete()
        .eq('id', reportId)
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

    // GET /summary - Aggregated DV summary
    if (url.pathname.endsWith('/summary') && req.method === 'GET') {
      const [incidentsResult, reportsResult] = await Promise.all([
        supabase
          .from('dv_incidents')
          .select('id, incident_date, incident_type, created_at')
          .eq('user_id', userId)
          .order('incident_date', { ascending: false }),
        supabase
          .from('dv_medical_reports')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ])

      if (incidentsResult.error) {
        return new Response(
          JSON.stringify({ ok: false, error: incidentsResult.error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const incidents = incidentsResult.data || []
      const byType: Record<string, number> = {}
      for (const inc of incidents) {
        byType[inc.incident_type] = (byType[inc.incident_type] || 0) + 1
      }

      return new Response(
        JSON.stringify({
          ok: true,
          summary: {
            totalIncidents: incidents.length,
            totalMedicalReports: reportsResult.count ?? 0,
            byType,
            latestIncident: incidents[0] || null,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── POLICE COMPLAINT TEMPLATE ──

    // POST /generate-complaint - Generate a police complaint template
    if (url.pathname.endsWith('/generate-complaint') && req.method === 'POST') {
      let body
      try {
        body = await req.json()
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { incident_id } = body
      if (!incident_id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'incident_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: incident, error: incErr } = await supabase
        .from('dv_incidents')
        .select('id, incident_date, incident_type, description, location, witnesses')
        .eq('id', incident_id)
        .eq('user_id', userId)
        .single()

      if (incErr || !incident) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Incident not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: userData } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single()

      const userName = [userData?.first_name, userData?.last_name].filter(Boolean).join(' ') || userData?.email || 'Complainant'
      const incidentDate = new Date(incident.incident_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

      const typeLabels: Record<string, string> = {
        physical: 'Physical Violence',
        emotional: 'Emotional / Mental Abuse',
        financial: 'Financial Abuse',
        sexual: 'Sexual Violence',
        threat: 'Threats / Intimidation',
        other: 'Domestic Violence',
      }

      const witnessLines = Array.isArray(incident.witnesses) && incident.witnesses.length > 0
        ? incident.witnesses.map((w: any, i: number) => `  ${i + 1}. ${w.name || 'Unknown'}${w.phone ? ` (${w.phone})` : ''}`).join('\n')
        : '  None listed'

      const template = `POLICE COMPLAINT
(Under Section 498A IPC & Protection of Women from Domestic Violence Act, 2005)

To,
The Station House Officer,
_______________ Police Station,
_______________ (City/District)

Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

Subject: Complaint regarding ${typeLabels[incident.incident_type] || 'Domestic Violence'}

Respected Sir/Madam,

I, ${userName}, resident of _______________, hereby lodge this complaint regarding an incident of domestic violence that occurred on ${incidentDate}${incident.location ? ` at ${incident.location}` : ''}.

DETAILS OF THE INCIDENT:
${incident.description}

TYPE OF VIOLENCE: ${typeLabels[incident.incident_type] || incident.incident_type}

WITNESSES:
${witnessLines}

I request you to kindly take cognizance of the above complaint, register an FIR under appropriate sections of law, and take necessary action against the accused.

I am willing to provide any additional evidence or statements as required for the investigation.

Yours faithfully,

${userName}
(Signature)

Contact: _______________
Address: _______________

---
Generated by Blue Drum AI on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
This is a template. Please review with a legal professional before filing.`

      return new Response(
        JSON.stringify({ ok: true, complaint: template }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('DV function error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
