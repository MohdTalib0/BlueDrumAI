import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { verifyAuth } from '../_shared/auth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

async function requireAdmin(req: Request, corsHeaders: Record<string, string>) {
  const { user, error } = await verifyAuth(req)
  if (error || !user) {
    return { response: new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
  }

  const supabase = createSupabaseClient(req)
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return { response: new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
  }

  return { user, supabase, role: profile.role }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace(/.*\/admin/, '')

    // GET /stats — Overview stats
    if (path === '/stats' && req.method === 'GET') {
      const result = await requireAdmin(req, corsHeaders)
      if ('response' in result) return result.response
      const { supabase } = result

      const [
        { count: totalUsers },
        { count: totalFeedback },
        { count: openFeedback },
        { data: recentUsers },
        { data: aiUsageData },
        { data: usersByGender },
        { data: recentSignups },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('feedback').select('*', { count: 'exact', head: true }),
        supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('users').select('id, email, first_name, last_name, gender, role, created_at, onboarding_completed').order('created_at', { ascending: false }).limit(10),
        supabase.from('ai_usage_logs').select('total_tokens, total_cost, service_type, created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('users').select('gender'),
        supabase.from('users').select('created_at').order('created_at', { ascending: false }).limit(100),
      ])

      const genderBreakdown: Record<string, number> = {}
      usersByGender?.forEach((u: any) => {
        const g = u.gender || 'unset'
        genderBreakdown[g] = (genderBreakdown[g] || 0) + 1
      })

      let totalTokens = 0, totalCost = 0
      const serviceBreakdown: Record<string, number> = {}
      aiUsageData?.forEach((log: any) => {
        totalTokens += log.total_tokens || 0
        totalCost += parseFloat(log.total_cost) || 0
        const svc = log.service_type || 'other'
        serviceBreakdown[svc] = (serviceBreakdown[svc] || 0) + 1
      })

      const signupsByDay: Record<string, number> = {}
      recentSignups?.forEach((u: any) => {
        const day = u.created_at?.substring(0, 10)
        if (day) signupsByDay[day] = (signupsByDay[day] || 0) + 1
      })
      const signupTrend = Object.entries(signupsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, count]) => ({ date, count }))

      return new Response(JSON.stringify({
        ok: true,
        stats: {
          totalUsers: totalUsers || 0,
          totalFeedback: totalFeedback || 0,
          openFeedback: openFeedback || 0,
          totalTokens,
          totalCost: Math.round(totalCost * 100) / 100,
          genderBreakdown,
          serviceBreakdown,
          signupTrend,
          recentUsers: recentUsers || [],
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // GET /users — List all users
    if (path === '/users' && req.method === 'GET') {
      const result = await requireAdmin(req, corsHeaders)
      if ('response' in result) return result.response
      const { supabase } = result

      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
      const search = url.searchParams.get('search') || ''
      const offset = (page - 1) * limit

      let query = supabase
        .from('users')
        .select('id, email, first_name, last_name, gender, role, relationship_status, onboarding_completed, login_count, created_at, updated_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (search) {
        query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
      }

      const { data, count, error: dbErr } = await query
      if (dbErr) {
        return new Response(JSON.stringify({ ok: false, error: dbErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ ok: true, users: data || [], total: count || 0, page, limit }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // GET /users/:id/trajectory — Full user activity timeline
    if (path.match(/^\/users\/[^/]+\/trajectory$/) && req.method === 'GET') {
      const result = await requireAdmin(req, corsHeaders)
      if ('response' in result) return result.response
      const { supabase } = result

      const userId = path.replace('/users/', '').replace('/trajectory', '')

      const [
        { data: profile },
        { data: vaultEntries },
        { data: chatAnalyses },
        { data: incomeEntries },
        { data: dvIncidents },
        { data: dowryEntries },
        { data: breakupMsgs },
        { data: maintenanceCalcs },
        { data: feedbackItems },
        { data: aiUsage },
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('vault_entries').select('id, type, description, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('chat_analyses').select('id, risk_score, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('income_tracker').select('id, month_year, gross_income, disposable_income, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('dv_incidents').select('id, incident_type, incident_date, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('dowry_entries').select('id, item_description, value, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('breakup_messages').select('id, tone, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('maintenance_calculations').select('id, total_maintenance, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('feedback').select('id, type, title, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('ai_usage_logs').select('id, service_type, model, total_tokens, total_cost, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
      ])

      if (!profile) {
        return new Response(JSON.stringify({ ok: false, error: 'User not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Build unified timeline
      const timeline: any[] = []

      timeline.push({ type: 'signup', module: 'Account', detail: `Signed up with ${profile.email}`, date: profile.created_at })

      if (profile.onboarding_completed) {
        timeline.push({ type: 'onboarding', module: 'Account', detail: `Completed onboarding as "${profile.gender}"`, date: profile.updated_at })
      }

      vaultEntries?.forEach((e: any) => timeline.push({ type: 'vault_upload', module: 'Consent Vault', detail: e.description || `Uploaded ${e.type}`, date: e.created_at }))
      chatAnalyses?.forEach((e: any) => timeline.push({ type: 'chat_analysis', module: 'Red Flag Radar', detail: `Analysis — risk score: ${e.risk_score ?? '?'}`, date: e.created_at }))
      incomeEntries?.forEach((e: any) => timeline.push({ type: 'income_log', module: 'Income Tracker', detail: `Logged income: ₹${Number(e.gross_income).toLocaleString('en-IN')}`, date: e.created_at }))
      dvIncidents?.forEach((e: any) => timeline.push({ type: 'dv_incident', module: 'DV Log', detail: `Reported ${e.incident_type} incident`, date: e.incident_date || e.created_at }))
      dowryEntries?.forEach((e: any) => timeline.push({ type: 'dowry_entry', module: 'Dowry Vault', detail: e.item_description || `Documented item (₹${Number(e.value || 0).toLocaleString('en-IN')})`, date: e.created_at }))
      breakupMsgs?.forEach((e: any) => timeline.push({ type: 'breakup_msg', module: 'Breakup Generator', detail: `Generated ${e.tone || ''} message`, date: e.created_at }))
      maintenanceCalcs?.forEach((e: any) => timeline.push({ type: 'maintenance_calc', module: 'Maintenance Calc', detail: `Calculated: ₹${Number(e.total_maintenance || 0).toLocaleString('en-IN')}/mo`, date: e.created_at }))
      feedbackItems?.forEach((e: any) => timeline.push({ type: 'feedback', module: 'Feedback', detail: `${e.type}: ${e.title}`, date: e.created_at }))
      aiUsage?.forEach((e: any) => timeline.push({ type: 'ai_call', module: 'AI', detail: `${e.service_type} via ${e.model} (${e.total_tokens} tokens)`, date: e.created_at }))

      timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Module summary
      const moduleCounts: Record<string, number> = {}
      timeline.forEach(e => { moduleCounts[e.module] = (moduleCounts[e.module] || 0) + 1 })

      return new Response(JSON.stringify({
        ok: true,
        user: { id: profile.id, email: profile.email, first_name: profile.first_name, last_name: profile.last_name, gender: profile.gender, role: profile.role, created_at: profile.created_at },
        timeline,
        moduleCounts,
        totalEvents: timeline.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // PATCH /users/:id — Update user (role, etc.)
    if (path.startsWith('/users/') && req.method === 'PATCH') {
      const result = await requireAdmin(req, corsHeaders)
      if ('response' in result) return result.response
      const { supabase, role: adminRole } = result

      const userId = path.replace('/users/', '')
      const body = await req.json()

      const allowed: Record<string, unknown> = {}
      if (body.role && ['user', 'admin', 'super_admin'].includes(body.role)) {
        if (body.role === 'super_admin' && adminRole !== 'super_admin') {
          return new Response(JSON.stringify({ ok: false, error: 'Only super admins can assign super_admin role' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        allowed.role = body.role
      }

      if (Object.keys(allowed).length === 0) {
        return new Response(JSON.stringify({ ok: false, error: 'No valid fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { error: updateErr } = await supabase.from('users').update(allowed).eq('id', userId)
      if (updateErr) {
        return new Response(JSON.stringify({ ok: false, error: updateErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // GET /feedback — List all feedback
    if (path === '/feedback' && req.method === 'GET') {
      const result = await requireAdmin(req, corsHeaders)
      if ('response' in result) return result.response
      const { supabase } = result

      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
      const status = url.searchParams.get('status') || ''
      const offset = (page - 1) * limit

      let query = supabase
        .from('feedback')
        .select('id, user_id, type, title, description, status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) query = query.eq('status', status)

      const { data, count, error: dbErr } = await query
      if (dbErr) {
        return new Response(JSON.stringify({ ok: false, error: dbErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Fetch user emails for feedback items
      const userIds = [...new Set((data || []).map((f: any) => f.user_id).filter(Boolean))]
      let userMap: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, email, first_name, last_name').in('id', userIds)
        users?.forEach((u: any) => {
          userMap[u.id] = u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.email
        })
      }

      const enriched = (data || []).map((f: any) => ({ ...f, user_name: userMap[f.user_id] || 'Unknown' }))

      return new Response(JSON.stringify({ ok: true, feedback: enriched, total: count || 0, page, limit }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // PATCH /feedback/:id — Update feedback status
    if (path.startsWith('/feedback/') && req.method === 'PATCH') {
      const result = await requireAdmin(req, corsHeaders)
      if ('response' in result) return result.response
      const { supabase } = result

      const feedbackId = path.replace('/feedback/', '')
      const body = await req.json()

      if (!body.status || !['open', 'in_review', 'resolved', 'closed'].includes(body.status)) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid status' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { error: updateErr } = await supabase.from('feedback').update({ status: body.status }).eq('id', feedbackId)
      if (updateErr) {
        return new Response(JSON.stringify({ ok: false, error: updateErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // GET /ai-usage — AI usage logs
    if (path === '/ai-usage' && req.method === 'GET') {
      const result = await requireAdmin(req, corsHeaders)
      if ('response' in result) return result.response
      const { supabase } = result

      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
      const offset = (page - 1) * limit

      const { data, count, error: dbErr } = await supabase
        .from('ai_usage_logs')
        .select('id, user_id, service_type, provider, model, input_tokens, output_tokens, total_tokens, total_cost, response_time_ms, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (dbErr) {
        return new Response(JSON.stringify({ ok: false, error: dbErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Fetch user emails
      const userIds = [...new Set((data || []).map((l: any) => l.user_id).filter(Boolean))]
      let userMap: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, email').in('id', userIds)
        users?.forEach((u: any) => { userMap[u.id] = u.email })
      }

      const enriched = (data || []).map((l: any) => ({ ...l, user_email: userMap[l.user_id] || 'Unknown' }))

      return new Response(JSON.stringify({ ok: true, logs: enriched, total: count || 0, page, limit }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // GET /feature-usage — Feature usage stats across all modules
    if (path === '/feature-usage' && req.method === 'GET') {
      const result = await requireAdmin(req, corsHeaders)
      if ('response' in result) return result.response
      const { supabase } = result

      const [
        { count: vaultCount },
        { count: chatCount },
        { count: incomeCount },
        { count: dvCount },
        { count: dowryCount },
        { count: breakupCount },
        { count: maintenanceCount },
        { data: vaultByUser },
        { data: chatByUser },
        { data: incomeByUser },
        { data: dvByUser },
        { data: dowryByUser },
        { data: breakupByUser },
        { data: maintenanceByUser },
        { data: recentVault },
        { data: recentChat },
        { data: recentIncome },
        { data: recentBreakup },
      ] = await Promise.all([
        supabase.from('vault_entries').select('*', { count: 'exact', head: true }),
        supabase.from('chat_analyses').select('*', { count: 'exact', head: true }),
        supabase.from('income_tracker').select('*', { count: 'exact', head: true }),
        supabase.from('dv_incidents').select('*', { count: 'exact', head: true }),
        supabase.from('dowry_entries').select('*', { count: 'exact', head: true }),
        supabase.from('breakup_messages').select('*', { count: 'exact', head: true }),
        supabase.from('maintenance_calculations').select('*', { count: 'exact', head: true }),
        supabase.from('vault_entries').select('user_id'),
        supabase.from('chat_analyses').select('user_id'),
        supabase.from('income_tracker').select('user_id'),
        supabase.from('dv_incidents').select('user_id'),
        supabase.from('dowry_entries').select('user_id'),
        supabase.from('breakup_messages').select('user_id'),
        supabase.from('maintenance_calculations').select('user_id'),
        supabase.from('vault_entries').select('user_id, created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('chat_analyses').select('user_id, created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('income_tracker').select('user_id, created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('breakup_messages').select('user_id, created_at').order('created_at', { ascending: false }).limit(200),
      ])

      const uniqueUsers = (rows: any[]) => new Set(rows?.map((r: any) => r.user_id) || []).size

      const features = [
        { name: 'Consent Vault', key: 'vault', totalActions: vaultCount || 0, uniqueUsers: uniqueUsers(vaultByUser || []) },
        { name: 'Red Flag Radar', key: 'chat_analysis', totalActions: chatCount || 0, uniqueUsers: uniqueUsers(chatByUser || []) },
        { name: 'Income Tracker', key: 'income', totalActions: incomeCount || 0, uniqueUsers: uniqueUsers(incomeByUser || []) },
        { name: 'DV Incident Log', key: 'dv_log', totalActions: dvCount || 0, uniqueUsers: uniqueUsers(dvByUser || []) },
        { name: 'Dowry Vault', key: 'dowry', totalActions: dowryCount || 0, uniqueUsers: uniqueUsers(dowryByUser || []) },
        { name: 'Breakup Generator', key: 'breakup', totalActions: breakupCount || 0, uniqueUsers: uniqueUsers(breakupByUser || []) },
        { name: 'Maintenance Calc', key: 'maintenance', totalActions: maintenanceCount || 0, uniqueUsers: uniqueUsers(maintenanceByUser || []) },
      ].sort((a, b) => b.totalActions - a.totalActions)

      // Activity by day (last 14 days)
      const allRecent = [
        ...(recentVault || []).map((r: any) => ({ ...r, feature: 'Consent Vault' })),
        ...(recentChat || []).map((r: any) => ({ ...r, feature: 'Red Flag Radar' })),
        ...(recentIncome || []).map((r: any) => ({ ...r, feature: 'Income Tracker' })),
        ...(recentBreakup || []).map((r: any) => ({ ...r, feature: 'Breakup Generator' })),
      ]
      const activityByDay: Record<string, Record<string, number>> = {}
      allRecent.forEach((r: any) => {
        const day = r.created_at?.substring(0, 10)
        if (!day) return
        if (!activityByDay[day]) activityByDay[day] = {}
        activityByDay[day][r.feature] = (activityByDay[day][r.feature] || 0) + 1
      })
      const activityTrend = Object.entries(activityByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, features]) => ({ date, total: Object.values(features).reduce((s, n) => s + n, 0), ...features }))

      // Top users by total activity
      const userActivity: Record<string, number> = {}
      const allUsers = [...(vaultByUser || []), ...(chatByUser || []), ...(incomeByUser || []), ...(dvByUser || []), ...(dowryByUser || []), ...(breakupByUser || []), ...(maintenanceByUser || [])]
      allUsers.forEach((r: any) => { userActivity[r.user_id] = (userActivity[r.user_id] || 0) + 1 })
      const topUserIds = Object.entries(userActivity).sort(([, a], [, b]) => b - a).slice(0, 10)

      let topUsers: any[] = []
      if (topUserIds.length > 0) {
        const ids = topUserIds.map(([id]) => id)
        const { data: userData } = await supabase.from('users').select('id, email, first_name, last_name, gender').in('id', ids)
        topUsers = topUserIds.map(([id, count]) => {
          const u = userData?.find((u: any) => u.id === id)
          return { id, email: u?.email || 'Unknown', name: [u?.first_name, u?.last_name].filter(Boolean).join(' ') || '', gender: u?.gender || '', totalActions: count }
        })
      }

      const totalActions = features.reduce((s, f) => s + f.totalActions, 0)

      return new Response(JSON.stringify({
        ok: true,
        data: { features, activityTrend, topUsers, totalActions },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // GET /subscriptions — Subscription overview
    if (path === '/subscriptions' && req.method === 'GET') {
      const result = await requireAdmin(req, corsHeaders)
      if ('response' in result) return result.response
      const { supabase } = result

      // Use targeted count queries instead of fetching all rows
      const [
        { count: totalSubs },
        { count: freeCount },
        { count: premiumCount },
        { count: activeCount },
        { count: cancelledCount },
        { count: pastDueCount },
        { count: expiredCount },
        { data: recentSubs },
        { data: usageLimits },
      ] = await Promise.all([
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('plan', 'free'),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('plan', 'premium'),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'past_due'),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
        supabase.from('subscriptions').select('id, user_id, plan, status, created_at').order('created_at', { ascending: false }).limit(20),
        supabase.from('usage_limits').select('month_year, ai_analyses_count, pdf_exports_count, vault_uploads_count, breakup_count, red_flag_count').order('month_year', { ascending: false }).limit(200),
      ])

      const planCounts: Record<string, number> = { free: freeCount ?? 0, premium: premiumCount ?? 0 }
      const statusCounts: Record<string, number> = { active: activeCount ?? 0, cancelled: cancelledCount ?? 0, past_due: pastDueCount ?? 0, expired: expiredCount ?? 0 }

      let totalAnalyses = 0, totalExports = 0, totalUploads = 0, totalBreakups = 0, totalRedFlags = 0
      const monthlyUsage: Record<string, { analyses: number; exports: number; uploads: number }> = {}
      ;(usageLimits || []).forEach((u: any) => {
        totalAnalyses += u.ai_analyses_count || 0
        totalExports += u.pdf_exports_count || 0
        totalUploads += u.vault_uploads_count || 0
        totalBreakups += u.breakup_count || 0
        totalRedFlags += u.red_flag_count || 0
        const m = u.month_year?.substring(0, 7) || 'unknown'
        if (!monthlyUsage[m]) monthlyUsage[m] = { analyses: 0, exports: 0, uploads: 0 }
        monthlyUsage[m].analyses += u.ai_analyses_count || 0
        monthlyUsage[m].exports += u.pdf_exports_count || 0
        monthlyUsage[m].uploads += u.vault_uploads_count || 0
      })
      const usageTrend = Object.entries(monthlyUsage).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, d]) => ({ month, ...d }))

      // Enrich recent subs with user email
      const userIds = [...new Set((recentSubs || []).map((s: any) => s.user_id))]
      let userMap: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, email, first_name, last_name').in('id', userIds)
        users?.forEach((u: any) => { userMap[u.id] = u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.email })
      }
      const enrichedSubs = (recentSubs || []).map((s: any) => ({ ...s, user_name: userMap[s.user_id] || 'Unknown' }))

      return new Response(JSON.stringify({
        ok: true,
        data: {
          totalSubscriptions: totalSubs ?? 0,
          planCounts,
          statusCounts,
          usageTotals: { analyses: totalAnalyses, exports: totalExports, uploads: totalUploads, breakups: totalBreakups, redFlags: totalRedFlags },
          usageTrend,
          recentSubscriptions: enrichedSubs,
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // GET /geo — Geolocation & session analytics
    if (path === '/geo' && req.method === 'GET') {
      const result = await requireAdmin(req, corsHeaders)
      if ('response' in result) return result.response
      const { supabase } = result

      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('id, user_id, ip_address, user_agent, device_info, location_info, is_active, last_activity_at, created_at')
        .order('created_at', { ascending: false })
        .limit(500)

      const countryMap: Record<string, number> = {}
      const cityMap: Record<string, number> = {}
      const deviceMap: Record<string, number> = {}
      const browserMap: Record<string, number> = {}
      const osMap: Record<string, number> = {}
      let activeSessions = 0

      ;(sessions || []).forEach((s: any) => {
        if (s.is_active) activeSessions++

        const loc = s.location_info || {}
        const country = loc.country || loc.country_name || 'Unknown'
        const city = loc.city || 'Unknown'
        countryMap[country] = (countryMap[country] || 0) + 1
        if (city !== 'Unknown') cityMap[city] = (cityMap[city] || 0) + 1

        const dev = s.device_info || {}
        const deviceType = dev.device_type || dev.type || (s.user_agent?.includes('Mobile') ? 'Mobile' : 'Desktop')
        deviceMap[deviceType] = (deviceMap[deviceType] || 0) + 1
        const browser = dev.browser || dev.browser_name || 'Unknown'
        browserMap[browser] = (browserMap[browser] || 0) + 1
        const os = dev.os || dev.os_name || 'Unknown'
        osMap[os] = (osMap[os] || 0) + 1
      })

      const toSorted = (map: Record<string, number>) =>
        Object.entries(map).sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }))

      // Sessions by day (last 14 days)
      const sessionsByDay: Record<string, number> = {}
      ;(sessions || []).forEach((s: any) => {
        const day = s.created_at?.substring(0, 10)
        if (day) sessionsByDay[day] = (sessionsByDay[day] || 0) + 1
      })
      const sessionTrend = Object.entries(sessionsByDay).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, count]) => ({ date, count }))

      // Recent sessions enriched with user email
      const recentSessions = (sessions || []).slice(0, 20)
      const userIds = [...new Set(recentSessions.map((s: any) => s.user_id).filter(Boolean))]
      let userMap: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, email').in('id', userIds)
        users?.forEach((u: any) => { userMap[u.id] = u.email })
      }
      const enrichedSessions = recentSessions.map((s: any) => ({ ...s, user_email: userMap[s.user_id] || 'Unknown' }))

      return new Response(JSON.stringify({
        ok: true,
        data: {
          totalSessions: sessions?.length || 0,
          activeSessions,
          countries: toSorted(countryMap),
          cities: toSorted(cityMap).slice(0, 20),
          devices: toSorted(deviceMap),
          browsers: toSorted(browserMap),
          operatingSystems: toSorted(osMap),
          sessionTrend,
          recentSessions: enrichedSessions,
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Admin function error:', error)
    return new Response(JSON.stringify({ ok: false, error: 'Server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
