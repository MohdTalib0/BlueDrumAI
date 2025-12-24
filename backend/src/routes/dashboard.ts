import express from 'express'
import { requireAuth, getUserId } from '../middleware/auth'
import { supabaseAdmin } from '../supabase'

const router = express.Router()

/**
 * GET /api/dashboard/stats
 * Get comprehensive dashboard statistics
 */
router.get('/stats', requireAuth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Fetch all stats in parallel
    const [
      vaultResult,
      chatAnalysesResult,
      incomeResult,
      recentActivityResult,
    ] = await Promise.all([
      // Vault entries
      supabaseAdmin
        .from('vault_entries')
        .select('id, type, created_at, metadata')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      // Chat analyses
      supabaseAdmin
        .from('chat_analyses')
        .select('id, risk_score, created_at, platform, red_flags')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      // Income entries
      supabaseAdmin
        .from('income_tracker')
        .select('id, month_year, gross_income, disposable_income, created_at')
        .eq('user_id', userId)
        .order('month_year', { ascending: false })
        .limit(12), // Last 12 months

      // Recent activity (from audit logs or combine all)
      Promise.resolve({ data: [], error: null }), // Placeholder - will combine activities
    ])

    // Calculate vault stats
    const vaultEntries = vaultResult.data || []
    const vaultStats = {
      total: vaultEntries.length,
      byType: vaultEntries.reduce((acc: Record<string, number>, entry: any) => {
        acc[entry.type] = (acc[entry.type] || 0) + 1
        return acc
      }, {}),
      recent: vaultEntries.slice(0, 5).map((entry: any) => ({
        id: entry.id,
        type: entry.type,
        date: entry.created_at,
        action: 'uploaded',
        module: 'Consent Vault',
      })),
    }

    // Calculate chat analysis stats
    const chatAnalyses = chatAnalysesResult.data || []
    const avgRiskScore =
      chatAnalyses.length > 0
        ? Math.round(chatAnalyses.reduce((sum: number, a: any) => sum + (a.risk_score || 0), 0) / chatAnalyses.length)
        : 0
    const highestRisk = chatAnalyses.length > 0
      ? Math.max(...chatAnalyses.map((a: any) => a.risk_score || 0))
      : 0
    const totalRedFlags = chatAnalyses.reduce((sum: number, a: any) => sum + ((a.red_flags as any[])?.length || 0), 0)

    const chatStats = {
      total: chatAnalyses.length,
      avgRiskScore,
      highestRisk,
      totalRedFlags,
      byPlatform: chatAnalyses.reduce((acc: Record<string, number>, entry: any) => {
        const platform = entry.platform || 'unknown'
        acc[platform] = (acc[platform] || 0) + 1
        return acc
      }, {}),
      recent: chatAnalyses.slice(0, 5).map((entry: any) => ({
        id: entry.id,
        riskScore: entry.risk_score,
        date: entry.created_at,
        action: 'analyzed',
        module: 'Red Flag Radar',
        platform: entry.platform,
      })),
    }

    // Calculate income stats
    const incomeEntries = incomeResult.data || []
    const incomeStats = {
      totalEntries: incomeEntries.length,
      totalGross: incomeEntries.reduce((sum: number, e: any) => sum + parseFloat(e.gross_income || 0), 0),
      totalDisposable: incomeEntries.reduce((sum: number, e: any) => sum + parseFloat(e.disposable_income || 0), 0),
      avgDisposable: incomeEntries.length > 0
        ? incomeEntries.reduce((sum: number, e: any) => sum + parseFloat(e.disposable_income || 0), 0) / incomeEntries.length
        : 0,
      monthlyTrend: incomeEntries
        .sort((a: any, b: any) => a.month_year.localeCompare(b.month_year))
        .map((entry: any) => ({
          month: entry.month_year,
          gross: parseFloat(entry.gross_income || 0),
          disposable: parseFloat(entry.disposable_income || 0),
        })),
      recent: incomeEntries.slice(0, 5).map((entry: any) => ({
        id: entry.id,
        month: entry.month_year,
        disposable: parseFloat(entry.disposable_income || 0),
        date: entry.created_at,
        action: 'logged',
        module: 'Income Tracker',
      })),
    }

    // Combine recent activity
    const recentActivity = [
      ...vaultStats.recent.map((a: any) => ({ ...a, timestamp: a.date })),
      ...chatStats.recent.map((a: any) => ({ ...a, timestamp: a.date })),
      ...incomeStats.recent.map((a: any) => ({ ...a, timestamp: a.date })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    // Calculate overall readiness score (0-100)
    // Based on: vault entries (30%), chat analyses (30%), income tracking (20%), recent activity (20%)
    const readinessScore = Math.min(
      100,
      Math.round(
        (Math.min(vaultEntries.length * 5, 30)) + // Vault entries contribute up to 30 points
        (Math.min(chatAnalyses.length * 3, 30)) + // Chat analyses contribute up to 30 points
        (Math.min(incomeEntries.length * 4, 20)) + // Income entries contribute up to 20 points
        (Math.min(recentActivity.length * 2, 20)) // Recent activity contributes up to 20 points
      )
    )

    res.json({
      success: true,
      stats: {
        vault: vaultStats,
        chatAnalysis: chatStats,
        income: incomeStats,
        readinessScore,
        recentActivity,
      },
    })
  } catch (err: any) {
    console.error('[Dashboard] Error fetching stats:', err)
    next(err)
  }
})

export default router

