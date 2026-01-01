import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'
import { getUserId } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
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

    // GET /stats - Get dashboard statistics
    if (url.pathname.endsWith('/stats') && req.method === 'GET') {
      // 1. Vault Stats
      const { data: vaultEntries, error: vaultError } = await supabase
        .from('vault_entries')
        .select('id, type, module, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const vaultTotal = vaultEntries?.length || 0
      
      const vaultByType: Record<string, number> = {}
      if (vaultEntries) {
        vaultEntries.forEach(entry => {
          vaultByType[entry.type] = (vaultByType[entry.type] || 0) + 1
        })
      }

      const vaultRecent = vaultEntries?.slice(0, 5).map(e => ({
        id: e.id,
        type: e.type,
        date: e.created_at,
        action: 'uploaded',
        module: e.module || 'Consent Vault'
      })) || []

      // 2. Chat Analysis Stats
      const { data: analyses, error: analysisError } = await supabase
        .from('chat_analyses')
        .select('id, risk_score, red_flags, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const analysisTotal = analyses?.length || 0
      
      let totalRiskScore = 0
      let highestRisk = 0
      let totalRedFlags = 0
      const analysisByPlatform: Record<string, number> = {}

      if (analyses) {
        analyses.forEach(a => {
          const score = a.risk_score || 0
          totalRiskScore += score
          if (score > highestRisk) highestRisk = score
          
          // Count red flags if it's an array
          if (Array.isArray(a.red_flags)) {
            totalRedFlags += a.red_flags.length
          } else if (typeof a.red_flags === 'object' && a.red_flags !== null) {
             // Handle if stored as object keys or another format
             totalRedFlags += Object.keys(a.red_flags).length
          }

          // Platform - not strictly in schema, assuming 'WhatsApp' for now or parsing from somewhere if available
          // If you add a platform column later, use it here.
          const platform = 'WhatsApp' 
          analysisByPlatform[platform] = (analysisByPlatform[platform] || 0) + 1
        })
      }

      const avgRiskScore = analysisTotal > 0 ? Math.round(totalRiskScore / analysisTotal) : 0

      const analysisRecent = analyses?.slice(0, 5).map(a => ({
        id: a.id,
        riskScore: a.risk_score,
        date: a.created_at,
        action: 'analyzed',
        module: 'Red Flag Radar',
        platform: 'WhatsApp' // Default
      })) || []

      // 3. Income Stats
      const { data: incomeEntries, error: incomeError } = await supabase
        .from('income_tracker')
        .select('*')
        .eq('user_id', userId)
        .order('month_year', { ascending: false })

      const incomeTotalEntries = incomeEntries?.length || 0
      let incomeTotalGross = 0
      let incomeTotalDisposable = 0
      const monthlyTrend: Array<{ month: string; gross: number; disposable: number }> = []

      if (incomeEntries) {
        // Group by month
        const grouped: Record<string, { gross: number; disposable: number }> = {}
        
        incomeEntries.forEach(entry => {
          const gross = parseFloat(entry.gross_income || 0)
          
          // Calculate disposable
          const deductions = entry.deductions || {}
          const expenses = entry.expenses || {}
          const totalDeductions = Object.values(deductions).reduce((sum: number, v: any) => sum + parseFloat(v || 0), 0)
          const totalExpenses = Object.values(expenses).reduce((sum: number, v: any) => sum + parseFloat(v || 0), 0)
          const disposable = gross - totalDeductions - totalExpenses

          incomeTotalGross += gross
          incomeTotalDisposable += disposable

          const month = entry.month_year.slice(0, 7) // YYYY-MM
          if (!grouped[month]) {
            grouped[month] = { gross: 0, disposable: 0 }
          }
          grouped[month].gross += gross
          grouped[month].disposable += disposable
        })

        // Convert to array
        Object.entries(grouped).forEach(([month, vals]) => {
          monthlyTrend.push({
            month,
            gross: vals.gross,
            disposable: vals.disposable
          })
        })
        
        // Sort by month ascending for chart
        monthlyTrend.sort((a, b) => a.month.localeCompare(b.month))
      }

      const incomeAvgDisposable = incomeTotalEntries > 0 ? Math.round(incomeTotalDisposable / incomeTotalEntries) : 0

      const incomeRecent = incomeEntries?.slice(0, 5).map(e => {
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
      }) || []

      // 4. Readiness Score
      const readinessScore = Math.min(100, Math.round(
        ((vaultTotal || 0) * 10) +
        ((analysisTotal > 0 ? 1 : 0) * 20) +
        ((incomeTotalEntries > 0 ? 1 : 0) * 20)
      ))

      // 5. Recent Activity (Aggregated)
      const recentActivity = []
      if (vaultRecent) recentActivity.push(...vaultRecent.map(x => ({ ...x, timestamp: x.date })))
      if (analysisRecent) recentActivity.push(...analysisRecent.map(x => ({ ...x, timestamp: x.date })))
      if (incomeRecent) recentActivity.push(...incomeRecent.map(x => ({ ...x, timestamp: x.date })))
      
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      const finalRecentActivity = recentActivity.slice(0, 10)

      // Construct Final Response matching Frontend Interface
      const stats = {
        vault: {
          total: vaultTotal,
          byType: vaultByType,
          recent: vaultRecent
        },
        chatAnalysis: {
          total: analysisTotal,
          avgRiskScore: avgRiskScore,
          highestRisk: highestRisk,
          totalRedFlags: totalRedFlags,
          byPlatform: analysisByPlatform,
          recent: analysisRecent
        },
        income: {
          totalEntries: incomeTotalEntries,
          totalGross: incomeTotalGross,
          totalDisposable: incomeTotalDisposable,
          avgDisposable: incomeAvgDisposable,
          monthlyTrend: monthlyTrend,
          recent: incomeRecent
        },
        readinessScore: readinessScore,
        recentActivity: finalRecentActivity
      }

      return new Response(
        JSON.stringify({
          ok: true,
          stats: stats
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
