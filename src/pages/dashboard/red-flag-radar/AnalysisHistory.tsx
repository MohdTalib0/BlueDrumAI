import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
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
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { format } from 'date-fns'

interface ChatAnalysis {
  id: string
  risk_score: number
  red_flags: any[]
  keywords_detected: string[]
  analysis_text: string
  created_at: string
}

export default function AnalysisHistory() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const [analyses, setAnalyses] = useState<ChatAnalysis[]>([])
  const [filteredAnalyses, setFilteredAnalyses] = useState<ChatAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'moderate' | 'low'>('all')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError('')
      if (!sessionToken) {
        throw new Error('Not authenticated')
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      const response = await fetch(`${apiBase}/api/analyze/history`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this analysis? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingId(id)
      if (!sessionToken) {
        throw new Error('Not authenticated')
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      const response = await fetch(`${apiBase}/api/analyze/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete analysis')
      }

      const updated = analyses.filter((a) => a.id !== id)
      setAnalyses(updated)
      applyFilters(updated, searchQuery, riskFilter)
    } catch (err: any) {
      alert(err.message || 'Failed to delete analysis')
    } finally {
      setDeletingId(null)
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-700 bg-red-50 border-red-200'
    if (score >= 60) return 'text-orange-700 bg-orange-50 border-orange-200'
    if (score >= 40) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    if (score >= 20) return 'text-blue-700 bg-blue-50 border-blue-200'
    return 'text-green-700 bg-green-50 border-green-200'
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
          analysis.analysis_text.toLowerCase().includes(lowerQuery) ||
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
            <p className="text-gray-600">Loading analysis history...</p>
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
    <DashboardLayout title="Analysis History" subtitle={`${analyses.length} ${analyses.length === 1 ? 'analysis' : 'analyses'}`}>
      <div className="w-full">
        {/* Header Actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate('/dashboard/red-flag-radar')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={() => navigate('/dashboard/red-flag-radar')}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Analysis
          </button>
        </div>

        {/* Statistics Cards */}
        {analyses.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-lg border border-gray-200/20 bg-white/50 p-4 shadow-sm">
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 shadow-sm">
              <p className="text-xs text-red-600">Critical</p>
              <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 shadow-sm">
              <p className="text-xs text-orange-600">High</p>
              <p className="text-2xl font-bold text-orange-700">{stats.high}</p>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-4 shadow-sm">
              <p className="text-xs text-yellow-600">Moderate</p>
              <p className="text-2xl font-bold text-yellow-700">{stats.moderate}</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 shadow-sm">
              <p className="text-xs text-green-600">Avg Risk</p>
              <p className="text-2xl font-bold text-green-700">{stats.avgRisk}</p>
            </div>
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
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as typeof riskFilter)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Empty State */}
        {analyses.length === 0 && !loading && (
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-12 text-center shadow-sm">
            <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No analyses yet</h3>
            <p className="mb-6 text-gray-600">Upload a WhatsApp chat export to start analyzing for red flags.</p>
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
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-8 text-center shadow-sm">
            <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No analyses found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}

        {/* Analyses List */}
        {filteredAnalyses.length > 0 && (
          <div className="space-y-4">
            {filteredAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-4 flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 ${getRiskColor(analysis.risk_score)}`}>
                          {getRiskIcon(analysis.risk_score)}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {getRiskLabel(analysis.risk_score)} Risk Analysis
                          </h3>
                          <p className="text-xs text-gray-500">
                            {format(new Date(analysis.created_at), 'MMMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>

                      {/* Risk Score */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">Risk Score:</span>
                          <span className={`text-2xl font-bold ${getRiskColor(analysis.risk_score).split(' ')[0]}`}>
                            {analysis.risk_score}
                          </span>
                          <span className="text-sm text-gray-500">/ 100</span>
                        </div>
                      </div>

                      {/* Summary */}
                      <p className="mb-4 line-clamp-2 text-sm text-gray-700">{analysis.analysis_text}</p>

                      {/* Stats */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
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
                        className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(analysis.id)}
                        disabled={deletingId === analysis.id}
                        className="rounded-lg border border-red-300 bg-white p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
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
    </DashboardLayout>
  )
}

