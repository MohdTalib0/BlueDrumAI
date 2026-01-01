import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AlertTriangle,
  X,
  FileText,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { format } from 'date-fns'
import { getEdgeFunctionUrl, getAuthHeadersWithSession } from '../../../lib/api'

interface ChatAnalysis {
  id: string
  risk_score: number
  red_flags: any[]
  keywords_detected: string[]
  analysis_text: string
  platform?: string
  created_at: string
  patterns_detected?: Array<{ pattern: string; description: string }>
  recommendations?: string[]
}

interface ComparisonInsights {
  trend: 'improving' | 'worsening' | 'stable' | 'mixed'
  riskTrend: {
    direction: 'increasing' | 'decreasing' | 'stable'
    change: number
    description: string
  }
  commonPatterns: Array<{
    pattern: string
    frequency: number
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
  }>
  escalationDetected: boolean
  escalationDetails?: {
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    evidence: string[]
  }
  insights: string[]
  recommendations: string[]
  summary: string
}

export default function CompareAnalyses() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const [analyses, setAnalyses] = useState<ChatAnalysis[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comparisonInsights, setComparisonInsights] = useState<ComparisonInsights | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

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

      const headers = await getAuthHeadersWithSession()
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`
      const response = await fetch(`${getEdgeFunctionUrl('analyze')}/history`, {
        headers,
      })

      if (!response.ok) {
        throw new Error('Failed to load analyses')
      }

      const data = await response.json()
      setAnalyses(data.analyses || [])
    } catch (err: any) {
      console.error('Error loading analyses:', err)
      setError(err.message || 'Failed to load analyses')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size < 5) {
          // Limit to 5 comparisons
          next.add(id)
        }
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setComparisonInsights(null)
  }

  const generateComparison = async () => {
    if (selectedIds.size < 2) {
      setError('Please select at least 2 analyses to compare')
      return
    }

    try {
      setAnalyzing(true)
      setError('')
      if (!sessionToken) {
        throw new Error('Not authenticated')
      }

      const headers = await getAuthHeadersWithSession()
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`
      const response = await fetch(`${getEdgeFunctionUrl('analyze')}/compare`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisIds: Array.from(selectedIds),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate comparison')
      }

      const data = await response.json()
      setComparisonInsights(data.comparison)
    } catch (err: any) {
      console.error('Error generating comparison:', err)
      setError(err.message || 'Failed to generate AI comparison')
    } finally {
      setAnalyzing(false)
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

  const selectedAnalyses = analyses.filter((a) => selectedIds.has(a.id))

  return (
    <DashboardLayout
      title="Compare Analyses"
      subtitle="Select up to 5 chat analyses to compare side-by-side"
    >
      <div className="w-full">
        {/* Selection Summary */}
        {selectedIds.size > 0 && (
          <div className="mb-6 rounded-lg border border-primary-200 bg-primary-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary-600" />
                <span className="font-semibold text-primary-900">
                  {selectedIds.size} analysis{selectedIds.size > 1 ? 'es' : ''} selected
                </span>
              </div>
              <button
                onClick={clearSelection}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
        ) : analyses.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No analyses yet</h3>
            <p className="mt-2 text-gray-600">Upload and analyze chats to compare them here.</p>
            <button
              onClick={() => navigate('/dashboard/red-flag-radar')}
              className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Analyze Chat
            </button>
          </div>
        ) : (
          <>
            {/* Analysis List */}
            <div className="mb-6 space-y-3">
              {analyses.map((analysis) => {
                const isSelected = selectedIds.has(analysis.id)
                return (
                  <div
                    key={analysis.id}
                    className={`rounded-lg border p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => toggleSelection(analysis.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 ${
                          isSelected
                            ? 'border-primary-600 bg-primary-600'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900">
                              Analysis from {format(new Date(analysis.created_at), 'MMM d, yyyy')}
                            </h3>
                            {analysis.platform && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                {analysis.platform}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-4">
                            <div className={`rounded-lg border px-3 py-1 ${getRiskColor(analysis.risk_score)}`}>
                              <span className="text-xs font-semibold">
                                Risk: {analysis.risk_score}/100 ({getRiskLabel(analysis.risk_score)})
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {analysis.red_flags?.length || 0} red flag{analysis.red_flags?.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-sm text-gray-600">
                              {analysis.keywords_detected?.length || 0} keyword{analysis.keywords_detected?.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/dashboard/red-flag-radar/results/${analysis.id}`)
                          }}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Comparison View */}
            {selectedAnalyses.length > 0 && (
              <div className="mt-8 space-y-6">
                {/* Side-by-Side Comparison */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Side-by-Side Comparison</h3>
                    <button
                      onClick={clearSelection}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedAnalyses.length}, minmax(300px, 1fr))` }}>
                      {selectedAnalyses.map((analysis) => (
                        <div key={analysis.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-500">
                              {format(new Date(analysis.created_at), 'MMM d, yyyy')}
                            </p>
                            {analysis.platform && (
                              <span className="mt-1 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                                {analysis.platform}
                              </span>
                            )}
                          </div>
                          <div className={`mb-3 rounded-lg border px-3 py-2 ${getRiskColor(analysis.risk_score)}`}>
                            <div className="text-2xl font-bold">{analysis.risk_score}</div>
                            <div className="text-xs font-semibold">{getRiskLabel(analysis.risk_score)} Risk</div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Red Flags:</span>
                              <span className="ml-2 text-gray-900">{analysis.red_flags?.length || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Keywords:</span>
                              <span className="ml-2 text-gray-900">{analysis.keywords_detected?.length || 0}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(`/dashboard/red-flag-radar/results/${analysis.id}`)}
                            className="mt-4 w-full rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI-Powered Comparison Button */}
                {selectedAnalyses.length >= 2 && !comparisonInsights && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
                    <Sparkles className="mx-auto mb-3 h-8 w-8 text-blue-600" />
                    <h3 className="mb-2 text-lg font-semibold text-blue-900">Get AI-Powered Insights</h3>
                    <p className="mb-4 text-sm text-blue-800">
                      Analyze trends, detect escalation, and get personalized recommendations based on your selected analyses.
                    </p>
                    <button
                      onClick={generateComparison}
                      disabled={analyzing}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Generate AI Comparison
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* AI Comparison Insights */}
                {comparisonInsights && (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <div className="mb-4 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary-600" />
                        <h3 className="text-lg font-semibold text-gray-900">AI Analysis Summary</h3>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{comparisonInsights.summary}</p>
                    </div>

                    {/* Risk Trend */}
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900">Risk Trend</h3>
                      <div className="flex items-center gap-4">
                        <div className={`flex h-16 w-16 items-center justify-center rounded-lg ${
                          comparisonInsights.riskTrend.direction === 'increasing' ? 'bg-red-100' :
                          comparisonInsights.riskTrend.direction === 'decreasing' ? 'bg-green-100' :
                          'bg-gray-100'
                        }`}>
                          {comparisonInsights.riskTrend.direction === 'increasing' && (
                            <TrendingUp className="h-8 w-8 text-red-600" />
                          )}
                          {comparisonInsights.riskTrend.direction === 'decreasing' && (
                            <TrendingDown className="h-8 w-8 text-green-600" />
                          )}
                          {comparisonInsights.riskTrend.direction === 'stable' && (
                            <Minus className="h-8 w-8 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-700">
                            {comparisonInsights.riskTrend.direction === 'increasing' ? 'Risk Increasing' :
                             comparisonInsights.riskTrend.direction === 'decreasing' ? 'Risk Decreasing' :
                             'Risk Stable'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {Math.abs(comparisonInsights.riskTrend.change)}% change
                          </div>
                          <div className="mt-1 text-sm text-gray-700">
                            {comparisonInsights.riskTrend.description}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Escalation Alert */}
                    {comparisonInsights.escalationDetected && comparisonInsights.escalationDetails && (
                      <div className={`rounded-lg border p-6 ${
                        comparisonInsights.escalationDetails.severity === 'critical' ? 'border-red-300 bg-red-50' :
                        comparisonInsights.escalationDetails.severity === 'high' ? 'border-orange-300 bg-orange-50' :
                        comparisonInsights.escalationDetails.severity === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                        'border-blue-300 bg-blue-50'
                      }`}>
                        <div className="mb-3 flex items-center gap-2">
                          <AlertTriangle className={`h-5 w-5 ${
                            comparisonInsights.escalationDetails.severity === 'critical' ? 'text-red-600' :
                            comparisonInsights.escalationDetails.severity === 'high' ? 'text-orange-600' :
                            comparisonInsights.escalationDetails.severity === 'medium' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                          <h3 className="text-lg font-semibold">Escalation Detected</h3>
                        </div>
                        <p className="mb-3 text-gray-700">{comparisonInsights.escalationDetails.description}</p>
                        {comparisonInsights.escalationDetails.evidence.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm font-semibold text-gray-700 mb-2">Evidence:</div>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                              {comparisonInsights.escalationDetails.evidence.map((evidence, idx) => (
                                <li key={idx}>{evidence}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Common Patterns */}
                    {comparisonInsights.commonPatterns.length > 0 && (
                      <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">Common Patterns</h3>
                        <div className="space-y-3">
                          {comparisonInsights.commonPatterns.map((pattern, idx) => (
                            <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900">{pattern.pattern}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      pattern.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                      pattern.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                      pattern.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {pattern.severity}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      ({pattern.frequency} time{pattern.frequency !== 1 ? 's' : ''})
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">{pattern.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Insights */}
                    {comparisonInsights.insights.length > 0 && (
                      <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">Key Insights</h3>
                        <ul className="space-y-2">
                          {comparisonInsights.insights.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-700">
                              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {comparisonInsights.recommendations.length > 0 && (
                      <div className="rounded-lg border border-primary-200 bg-primary-50 p-6">
                        <h3 className="mb-4 text-lg font-semibold text-primary-900">Recommendations</h3>
                        <ul className="space-y-2">
                          {comparisonInsights.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-primary-800">
                              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

