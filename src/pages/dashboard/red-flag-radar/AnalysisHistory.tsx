import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Plus,
  FileText,
  Trash2,
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { getEdgeFunctionUrl, authHeaders } from '../../../lib/api'
import ConfirmModal from '../../../components/ui/ConfirmModal'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface ChatAnalysis {
  id: string
  risk_score: number
  red_flags: any[]
  keywords_detected: string[]
  analysis_text: string | null
  created_at: string
}

interface TrendDataPoint {
  id: string
  date: string
  riskScore: number
  redFlagCount: number
  criticalCount: number
  highCount: number
  patternCount: number
  platform: string
}

interface TrendSummary {
  totalAnalyses: number
  avgRiskScore: number
  maxRiskScore: number
  minRiskScore: number
  latestRiskScore: number
  riskChange: number
  overallTrend: 'improving' | 'worsening' | 'stable' | 'mixed'
  topPatterns: { pattern: string; count: number; percentage: number }[]
}

interface TrendsData {
  dataPoints: TrendDataPoint[]
  summary: TrendSummary | null
}

export default function AnalysisHistory() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const [analyses, setAnalyses] = useState<ChatAnalysis[]>([])
  const [filteredAnalyses, setFilteredAnalyses] = useState<ChatAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'moderate' | 'low'>('all')
  const [trends, setTrends] = useState<TrendsData | null>(null)

  useEffect(() => {
    loadHistory()
    loadTrends()
  }, [])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError('')
      if (!sessionToken) {
        throw new Error('Not authenticated')
      }

      const headers = authHeaders(sessionToken!)
      const response = await fetch(`${getEdgeFunctionUrl('analyze')}/history`, {
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load history' }))
        throw new Error(errorData.error || 'Failed to load analysis history')
      }

      const data = await response.json()
      setAnalyses(data.analyses || [])
      setFilteredAnalyses(data.analyses || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis history')
    } finally {
      setLoading(false)
    }
  }

  const loadTrends = async () => {
    try {
      if (!sessionToken) return
      const headers = authHeaders(sessionToken!)
      const response = await fetch(`${getEdgeFunctionUrl('analyze')}/trends`, { headers })
      if (response.ok) {
        const data = await response.json()
        setTrends(data.trends)
      }
    } catch {
      // Trends are non-critical; silently fail
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null)
    try {
      setDeletingId(id)
      if (!sessionToken) {
        throw new Error('Not authenticated')
      }

      const headers = authHeaders(sessionToken!)
      const response = await fetch(`${getEdgeFunctionUrl('analyze')}/${id}`, {
        method: 'DELETE',
        headers,
      })

      if (!response.ok) {
        throw new Error('Failed to delete analysis')
      }

      const updated = analyses.filter((a) => a.id !== id)
      setAnalyses(updated)
      applyFilters(updated, searchQuery, riskFilter)
      loadTrends()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete analysis')
    } finally {
      setDeletingId(null)
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-700 bg-red-50 border-red-200 dark:bg-black dark:border-red-700/30 dark:text-red-300'
    if (score >= 60) return 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-black dark:border-orange-700/30 dark:text-orange-300'
    if (score >= 40) return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-black dark:border-yellow-700/30 dark:text-yellow-300'
    if (score >= 20) return 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-black dark:border-blue-700/30 dark:text-blue-300'
    return 'text-green-700 bg-green-50 border-green-200 dark:bg-black dark:border-green-700/30 dark:text-green-300'
  }

  const getRiskLabel = (score: number) => {
    if (score >= 80) return 'Critical'
    if (score >= 60) return 'High'
    if (score >= 40) return 'Moderate'
    if (score >= 20) return 'Low'
    return 'Minimal'
  }

  const getRiskIcon = (score: number) => {
    if (score >= 80) return <XCircle className="h-5 w-5 text-red-600" />
    if (score >= 60) return <AlertTriangle className="h-5 w-5 text-orange-600" />
    if (score >= 40) return <AlertCircle className="h-5 w-5 text-yellow-600" />
    return <CheckCircle2 className="h-5 w-5 text-green-600" />
  }

  const applyFilters = (data: ChatAnalysis[], query: string, filter: typeof riskFilter) => {
    let filtered = [...data]

    // Search filter
    if (query.trim()) {
      const lowerQuery = query.toLowerCase()
      filtered = filtered.filter(
        (analysis) =>
          (analysis.analysis_text || '').toLowerCase().includes(lowerQuery) ||
          (analysis.keywords_detected || []).some((k) => k.toLowerCase().includes(lowerQuery)) ||
          (analysis.red_flags || []).some((f: any) => f.type?.toLowerCase().includes(lowerQuery))
      )
    }

    // Risk level filter
    if (filter !== 'all') {
      filtered = filtered.filter((analysis) => {
        const score = analysis.risk_score
        switch (filter) {
          case 'critical':
            return score >= 80
          case 'high':
            return score >= 60 && score < 80
          case 'moderate':
            return score >= 40 && score < 60
          case 'low':
            return score < 40
          default:
            return true
        }
      })
    }

    setFilteredAnalyses(filtered)
  }

  useEffect(() => {
    applyFilters(analyses, searchQuery, riskFilter)
  }, [searchQuery, riskFilter, analyses])

  if (loading) {
    return (
      <DashboardLayout title="Analysis History" subtitle="View your chat analysis history">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mb-4 inline-block h-8 w-8 animate-spin text-primary-600" />
            <p className="text-gray-600 dark:text-gray-400">Loading analysis history...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Calculate statistics
  const stats = {
    total: analyses.length,
    critical: analyses.filter((a) => a.risk_score >= 80).length,
    high: analyses.filter((a) => a.risk_score >= 60 && a.risk_score < 80).length,
    moderate: analyses.filter((a) => a.risk_score >= 40 && a.risk_score < 60).length,
    low: analyses.filter((a) => a.risk_score < 40).length,
    avgRisk: analyses.length > 0 ? Math.round(analyses.reduce((sum, a) => sum + a.risk_score, 0) / analyses.length) : 0,
  }

  return (
    <DashboardLayout title="Analysis History" subtitle={`${analyses.length} ${analyses.length === 1 ? 'analysis' : 'analyses'}`} backHref="/dashboard/red-flag-radar">
      <div className="w-full">
        {/* Header Actions */}
        <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-3">
            {analyses.length > 1 && (
              <button
                onClick={() => navigate('/dashboard/red-flag-radar/compare')}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-100 transition-colors dark:bg-black dark:border-blue-700/40 dark:text-blue-300 dark:hover:bg-gray-900"
              >
                <GitCompare className="h-4 w-4" />
                Compare
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard/red-flag-radar')}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Analysis
            </button>
          </div>
        </div>

        {/* Stats + Risk Insight Row */}
        {analyses.length > 0 && (
          <div className="mb-6 flex flex-col gap-4 lg:flex-row">
            {/* Left: Stat Cards ~75% */}
            <div className="grid grid-cols-3 gap-3 lg:w-3/5">
              <div className="rounded-lg border border-gray-200/20 bg-white/50 p-3 shadow-sm dark:bg-black dark:border-primary-500/20">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 shadow-sm dark:bg-black dark:border-red-700/30">
                <p className="text-xs text-red-600">Critical</p>
                <p className="text-lg sm:text-2xl font-bold text-red-700">{stats.critical}</p>
              </div>
              <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 shadow-sm dark:bg-black dark:border-orange-700/30">
                <p className="text-xs text-orange-600">High</p>
                <p className="text-lg sm:text-2xl font-bold text-orange-700">{stats.high}</p>
              </div>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-3 shadow-sm dark:bg-black dark:border-yellow-700/30">
                <p className="text-xs text-yellow-600">Moderate</p>
                <p className="text-lg sm:text-2xl font-bold text-yellow-700">{stats.moderate}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 shadow-sm dark:bg-black dark:border-green-700/30">
                <p className="text-xs text-green-600">Low</p>
                <p className="text-lg sm:text-2xl font-bold text-green-700">{stats.low}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 shadow-sm dark:bg-black dark:border-blue-700/30">
                <p className="text-xs text-blue-600">Avg Risk</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-700">{stats.avgRisk}<span className="text-xs font-normal text-gray-400">/100</span></p>
              </div>
            </div>

            {/* Right: Risk Insight ~25% */}
            {trends && trends.dataPoints.length >= 1 && trends.summary ? (
              <div className="rounded-lg border border-gray-200/20 bg-white/50 p-3 sm:p-4 shadow-sm lg:w-2/5 dark:bg-black dark:border-primary-500/20">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                    <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                    Risk Insight
                  </h3>
                  {trends.summary.overallTrend === 'improving' && (
                    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-black">
                      <TrendingDown className="h-3 w-3" /> Improving
                    </span>
                  )}
                  {trends.summary.overallTrend === 'worsening' && (
                    <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-black">
                      <TrendingUp className="h-3 w-3" /> Worsening
                    </span>
                  )}
                  {trends.summary.overallTrend === 'stable' && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-black">
                      <Minus className="h-3 w-3" /> Stable
                    </span>
                  )}
                </div>

                {/* Mini chart when 2+ data points */}
                {trends.dataPoints.length >= 2 && (
                  <div className="mb-2" style={{ height: 64 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={trends.dataPoints.map((d) => ({ s: d.riskScore }))}
                        margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                      >
                        <defs>
                          <linearGradient id="riskGradientMini" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="s" stroke="#ef4444" strokeWidth={2} fill="url(#riskGradientMini)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Key numbers */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-gray-50 px-2.5 py-2 dark:bg-black">
                    <p className="text-[11px] text-gray-400">Latest</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{trends.summary.latestRiskScore}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-2.5 py-2 dark:bg-black">
                    <p className="text-[11px] text-gray-400">Average</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{trends.summary.avgRiskScore}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-2.5 py-2 dark:bg-black">
                    <p className="text-[11px] text-gray-400">Highest</p>
                    <p className="text-base font-bold text-red-600">{trends.summary.maxRiskScore}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-2.5 py-2 dark:bg-black">
                    <p className="text-[11px] text-gray-400">Change</p>
                    <p className={`text-base font-bold ${trends.summary.riskChange > 0 ? 'text-red-600' : trends.summary.riskChange < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      {trends.summary.riskChange > 0 ? '+' : ''}{trends.summary.riskChange}
                    </p>
                  </div>
                </div>

                {/* Top patterns */}
                {trends.summary.topPatterns.length > 0 && (
                  <div className="mt-2.5 border-t border-gray-100 pt-2.5 dark:border-primary-500/10">
                    <div className="flex flex-wrap gap-1.5">
                      {trends.summary.topPatterns.slice(0, 3).map((p) => (
                        <span key={p.pattern} className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 truncate max-w-full dark:bg-black dark:text-purple-300">
                          {p.pattern}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200/20 bg-white/50 p-3 sm:p-4 shadow-sm lg:w-2/5 flex items-center justify-center dark:bg-black dark:border-primary-500/20">
                <p className="text-sm text-gray-400 text-center">Risk insights appear after your first analysis</p>
              </div>
            )}
          </div>
        )}

        {/* Search and Filter */}
        {analyses.length > 0 && (
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search analyses, keywords, or red flags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:bg-black dark:border-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as typeof riskFilter)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:bg-black dark:border-gray-700 dark:text-gray-100"
              >
                <option value="all">All Risk Levels</option>
                <option value="critical">Critical (80+)</option>
                <option value="high">High (60-79)</option>
                <option value="moderate">Moderate (40-59)</option>
                <option value="low">Low (&lt;40)</option>
              </select>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:bg-black dark:border-red-700/40 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Empty State */}
        {analyses.length === 0 && !loading && (
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-12 text-center shadow-sm dark:bg-black dark:border-primary-500/20">
            <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">No analyses yet</h3>
            <p className="mb-6 text-gray-600 dark:text-gray-400">Upload a WhatsApp chat export to start analyzing for red flags.</p>
            <button
              onClick={() => navigate('/dashboard/red-flag-radar')}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Analyze First Chat
            </button>
          </div>
        )}

        {/* No Results Message */}
        {analyses.length > 0 && filteredAnalyses.length === 0 && (
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-8 text-center shadow-sm dark:bg-black dark:border-primary-500/20">
            <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">No analyses found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
          </div>
        )}

        {/* Analyses List */}
        {filteredAnalyses.length > 0 && (
          <div className="space-y-4">
            {filteredAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-all duration-200 shadow-sm hover:shadow-md dark:bg-black dark:border-primary-500/20 dark:hover:bg-primary-900/30"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-3 sm:mb-4 flex items-center gap-3">
                        <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg border-2 shrink-0 ${getRiskColor(analysis.risk_score)}`}>
                          {getRiskIcon(analysis.risk_score)}
                        </div>
                        <div>
                          <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                            {getRiskLabel(analysis.risk_score)} Risk
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {format(new Date(analysis.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>

                      {/* Risk Score */}
                      <div className="mb-3 sm:mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Risk Score:</span>
                          <span className={`text-xl sm:text-2xl font-bold ${getRiskColor(analysis.risk_score).split(' ')[0]}`}>
                            {analysis.risk_score}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">/ 100</span>
                        </div>
                      </div>

                      {/* Summary */}
                      <p className="mb-3 sm:mb-4 line-clamp-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">{analysis.analysis_text || 'No summary available'}</p>

                      {/* Stats */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="font-semibold">{analysis.red_flags?.length || 0} Red Flags</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold">{analysis.keywords_detected?.length || 0} Keywords</span>
                        </div>
                        {analysis.red_flags && analysis.red_flags.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="font-semibold">
                              {analysis.red_flags.filter((f: any) => f.severity === 'critical').length} Critical
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="ml-4 flex flex-col gap-2">
                      <button
                        onClick={() => navigate(`/dashboard/red-flag-radar/analysis/${analysis.id}`)}
                        className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 transition-colors dark:bg-black dark:border-primary-500/20 dark:text-gray-300 dark:hover:bg-primary-900/30"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(analysis.id)}
                        disabled={deletingId === analysis.id}
                        className="rounded-lg border border-red-300 bg-white p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors dark:bg-black dark:border-red-700/40 dark:hover:bg-red-900/20"
                        title="Delete"
                      >
                        {deletingId === analysis.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Delete this analysis?"
        message="This analysis will be permanently removed. This action cannot be undone."
      />
    </DashboardLayout>
  )
}

