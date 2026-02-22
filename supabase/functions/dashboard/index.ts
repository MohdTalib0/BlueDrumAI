import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { getUserId } from '../_shared/auth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

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

    if (url.pathname.endsWith('/stats') && req.method === 'GET') {
      // Run all queries in parallel
      const [vaultResult, analysisResult, incomeResult, breakupResult, redFlagResult] = await Promise.all([
        supabase
          .from('vault_entries')
          .select('id, type, module, created_at', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('chat_analyses')
          .select('id, risk_score, red_flags, platform, created_at', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('income_tracker')
          .select('id, month_year, gross_income, deductions, expenses, created_at', { count: 'exact' })
          .eq('user_id', userId)
          .order('month_year', { ascending: false })
          .limit(24),
        supabase
          .from('breakup_messages')
          .select('id, template_type, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('red_flag_experiences')
          .select('id, scenario_type, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      // --- Vault ---
      const vaultTotal = vaultResult.count ?? vaultResult.data?.length ?? 0
      const vaultEntries = vaultResult.data || []

      const vaultByType: Record<string, number> = {}
      vaultEntries.forEach(entry => {
        vaultByType[entry.type] = (vaultByType[entry.type] || 0) + 1
      })

      const vaultRecent = vaultEntries.slice(0, 5).map(e => ({
        id: e.id,
        type: e.type,
        date: e.created_at,
        action: 'uploaded',
        module: e.module || 'Consent Vault'
      }))

      // --- Chat Analyses ---
      const analyses = analysisResult.data || []
      const analysisTotal = analysisResult.count ?? analyses.length

      let totalRiskScore = 0
      let highestRisk = 0
      let totalRedFlags = 0
      const analysisByPlatform: Record<string, number> = {}

      analyses.forEach(a => {
        const score = a.risk_score || 0
        totalRiskScore += score
        if (score > highestRisk) highestRisk = score

        if (Array.isArray(a.red_flags)) {
          totalRedFlags += a.red_flags.length
        } else if (typeof a.red_flags === 'object' && a.red_flags !== null) {
          totalRedFlags += Object.keys(a.red_flags).length
        }

        const platform = a.platform || 'WhatsApp'
        analysisByPlatform[platform] = (analysisByPlatform[platform] || 0) + 1
      })

      const avgRiskScore = analysisTotal > 0 ? Math.round(totalRiskScore / analyses.length) : 0

      const analysisRecent = analyses.slice(0, 5).map(a => ({
        id: a.id,
        riskScore: a.risk_score,
        date: a.created_at,
        action: 'analyzed',
        module: 'Red Flag Radar',
        platform: a.platform || 'WhatsApp'
      }))

      // --- Income ---
      const incomeEntries = incomeResult.data || []
      const incomeTotalEntries = incomeResult.count ?? incomeEntries.length

      let incomeTotalGross = 0
      let incomeTotalDisposable = 0
      const grouped: Record<string, { gross: number; disposable: number }> = {}

      incomeEntries.forEach(entry => {
        const gross = parseFloat(entry.gross_income || 0)
        const deductions = entry.deductions || {}
        const expenses = entry.expenses || {}
        const totalDeductions = Object.values(deductions).reduce((sum: number, v: any) => sum + parseFloat(v || 0), 0)
        const totalExpenses = Object.values(expenses).reduce((sum: number, v: any) => sum + parseFloat(v || 0), 0)
        const disposable = gross - totalDeductions - totalExpenses

        incomeTotalGross += gross
        incomeTotalDisposable += disposable

        const month = entry.month_year.slice(0, 7)
        if (!grouped[month]) grouped[month] = { gross: 0, disposable: 0 }
        grouped[month].gross += gross
        grouped[month].disposable += disposable
      })

      const monthlyTrend = Object.entries(grouped)
        .map(([month, vals]) => ({ month, gross: vals.gross, disposable: vals.disposable }))
        .sort((a, b) => a.month.localeCompare(b.month))

      const incomeAvgDisposable = incomeTotalEntries > 0 ? Math.round(incomeTotalDisposable / incomeTotalEntries) : 0

      const incomeRecent = incomeEntries.slice(0, 5).map(e => {
        const gross = parseFloat(e.gross_income || 0)
        const deductions = Object.values(e.deductions || {}).reduce((s: number, v: any) => s + parseFloat(v || 0), 0)
        const expenses = Object.values(e.expenses || {}).reduce((s: number, v: any) => s + parseFloat(v || 0), 0)
        return {
          id: e.id,
          month: e.month_year,
          disposable: gross - deductions - expenses,
          date: e.created_at,
          action: 'logged',
          module: 'Income Tracker'
        }
      })

      // Readiness Score
      const readinessScore = Math.min(100, Math.round(
        ((vaultTotal || 0) * 10) +
        ((analysisTotal > 0 ? 1 : 0) * 20) +
        ((incomeTotalEntries > 0 ? 1 : 0) * 20)
      ))

      // Breakup Generator recent
      const breakupRecent = (breakupResult.data || []).map(b => ({
        id: b.id,
        date: b.created_at,
        timestamp: b.created_at,
        action: 'generated',
        module: 'Breakup Generator',
        type: b.template_type,
      }))

      // Red Flag Sessions recent
      const redFlagRecent = (redFlagResult.data || []).map(r => ({
        id: r.id,
        date: r.created_at,
        timestamp: r.created_at,
        action: 'practiced',
        module: 'Red Flag Radar',
        type: r.scenario_type,
      }))

      // Recent Activity (Aggregated)
      const recentActivity = [
        ...vaultRecent.map(x => ({ ...x, timestamp: x.date })),
        ...analysisRecent.map(x => ({ ...x, timestamp: x.date })),
        ...incomeRecent.map(x => ({ ...x, timestamp: x.date })),
        ...breakupRecent,
        ...redFlagRecent,
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)

      return new Response(
        JSON.stringify({
          ok: true,
          stats: {
            vault: { total: vaultTotal, byType: vaultByType, recent: vaultRecent },
            chatAnalysis: {
              total: analysisTotal,
              avgRiskScore,
              highestRisk,
              totalRedFlags,
              byPlatform: analysisByPlatform,
              recent: analysisRecent
            },
            income: {
              totalEntries: incomeTotalEntries,
              totalGross: incomeTotalGross,
              totalDisposable: incomeTotalDisposable,
              avgDisposable: incomeAvgDisposable,
              monthlyTrend,
              recent: incomeRecent
            },
            readinessScore,
            recentActivity
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Dashboard function error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
