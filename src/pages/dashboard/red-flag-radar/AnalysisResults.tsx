import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  Calendar,
  MessageSquare,
  Loader2,
  Trash2,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  FileDown,
  Printer,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { format } from 'date-fns'

interface RedFlag {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  context: string
  keyword?: string
}

interface PatternDetected {
  pattern: string
  description: string
  examples: string[]
}

interface ChatAnalysis {
  id: string
  risk_score: number
  red_flags: RedFlag[]
  keywords_detected: string[]
  analysis_text: string
  recommendations?: string[]
  patterns_detected?: PatternDetected[]
  chat_export_url?: string
  created_at: string
}

export default function AnalysisResults() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [analysis, setAnalysis] = useState<ChatAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (id) {
      loadAnalysis()
    }
  }, [id])

  const loadAnalysis = async () => {
    try {
      setLoading(true)
      setError('')
      if (!sessionToken) {
        throw new Error('Not authenticated')
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      const response = await fetch(`${apiBase}/api/analyze/${id}`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load analysis' }))
        throw new Error(errorData.error || 'Failed to load analysis')
      }

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis')
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async () => {
    if (!sessionToken || !id) {
      alert('Not authenticated')
      return
    }

    try {
      setExporting(true)
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      const response = await fetch(`${apiBase}/api/analyze/${id}/export`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to export PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chat-analysis-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      alert(err.message || 'Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this analysis? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      if (!sessionToken || !id) {
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

      navigate('/dashboard/red-flag-radar/history')
    } catch (err: any) {
      alert(err.message || 'Failed to delete analysis')
    } finally {
      setDeleting(false)
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
    if (score >= 80) return 'Critical Risk'
    if (score >= 60) return 'High Risk'
    if (score >= 40) return 'Moderate Risk'
    if (score >= 20) return 'Low Risk'
    return 'Minimal Risk'
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-300 bg-red-50'
      case 'high':
        return 'border-orange-300 bg-orange-50'
      case 'medium':
        return 'border-yellow-300 bg-yellow-50'
      default:
        return 'border-blue-300 bg-blue-50'
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Analysis Results" subtitle="Loading analysis...">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mb-4 inline-block h-8 w-8 animate-spin text-primary-600" />
            <p className="text-gray-600">Loading analysis results...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !analysis) {
    return (
      <DashboardLayout title="Analysis Results" subtitle="Error loading analysis">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-600" />
          <h3 className="mb-2 text-lg font-semibold text-red-900">Failed to Load Analysis</h3>
          <p className="mb-4 text-red-800">{error || 'Analysis not found'}</p>
          <button
            onClick={() => navigate('/dashboard/red-flag-radar')}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Upload
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Analysis Results" subtitle={`Risk Assessment - ${getRiskLabel(analysis.risk_score)}`}>
      <div className="w-full max-w-6xl mx-auto">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between no-print">
          <button
            onClick={() => navigate('/dashboard/red-flag-radar/history')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Export PDF
                </>
              )}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            {analysis.chat_export_url && (
              <a
                href={analysis.chat_export_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Chat
              </a>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>

        {/* Risk Score Card */}
        <div className={`mb-6 rounded-lg border-2 p-8 shadow-lg ${getRiskColor(analysis.risk_score)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-80">Risk Score</p>
              <p className="mb-2 text-6xl font-bold">{analysis.risk_score}</p>
              <p className="text-lg font-semibold">{getRiskLabel(analysis.risk_score)}</p>
            </div>
            <div className="text-right">
              {analysis.risk_score >= 80 ? (
                <XCircle className="h-20 w-20 opacity-50" />
              ) : analysis.risk_score >= 60 ? (
                <AlertTriangle className="h-20 w-20 opacity-50" />
              ) : analysis.risk_score >= 40 ? (
                <AlertCircle className="h-20 w-20 opacity-50" />
              ) : (
                <CheckCircle2 className="h-20 w-20 opacity-50" />
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
            <FileText className="h-5 w-5" />
            Analysis Summary
          </h3>
          <p className="text-sm leading-relaxed text-gray-700">{analysis.analysis_text}</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>Analyzed on {format(new Date(analysis.created_at), 'MMMM d, yyyy h:mm a')}</span>
          </div>
        </div>

        {/* Red Flags */}
        {analysis.red_flags && analysis.red_flags.length > 0 && (
          <div className="mb-6 rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Red Flags Detected ({analysis.red_flags.length})
              </h3>
              <span className="text-xs font-semibold text-gray-500">
                {analysis.red_flags.filter((f) => f.severity === 'critical').length} Critical •{' '}
                {analysis.red_flags.filter((f) => f.severity === 'high').length} High
              </span>
            </div>
            <div className="space-y-3">
              {analysis.red_flags.map((flag, index) => (
                <div
                  key={index}
                  className={`rounded-lg border-2 p-4 ${getSeverityColor(flag.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">{getSeverityIcon(flag.severity)}</div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide">
                          {flag.severity}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{flag.type}</span>
                      </div>
                      <p className="mb-2 text-sm font-medium text-gray-900">{flag.message}</p>
                      {flag.context && (
                        <div className="rounded-lg bg-white/80 p-2">
                          <p className="text-xs text-gray-600">
                            <span className="font-semibold">Context:</span> {flag.context}
                          </p>
                        </div>
                      )}
                      {flag.keyword && (
                        <p className="mt-1 text-xs text-gray-500">
                          Keyword: <span className="font-semibold">{flag.keyword}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keywords Detected */}
        {analysis.keywords_detected && analysis.keywords_detected.length > 0 && (
          <div className="mb-6 rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <MessageSquare className="h-5 w-5" />
              Keywords Detected ({analysis.keywords_detected.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.keywords_detected.map((keyword, index) => (
                <span
                  key={index}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Recommendations */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-blue-900">
              <Info className="h-5 w-5" />
              AI Recommendations ({analysis.recommendations.length})
            </h3>
            <div className="space-y-3">
              {analysis.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 rounded-lg bg-white/80 p-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <p className="text-sm leading-relaxed text-blue-900">{recommendation}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-blue-700">
              <strong>Note:</strong> This analysis is for informational purposes only and does not constitute legal advice. Please consult with a qualified legal professional for specific situations.
            </p>
          </div>
        )}

        {/* Detected Patterns */}
        {analysis.patterns_detected && analysis.patterns_detected.length > 0 && (
          <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50/50 p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-purple-900">
              <MessageSquare className="h-5 w-5" />
              Behavioral Patterns Detected ({analysis.patterns_detected.length})
            </h3>
            <div className="space-y-4">
              {analysis.patterns_detected.map((pattern, index) => (
                <div key={index} className="rounded-lg border border-purple-200 bg-white/80 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-purple-900">{pattern.pattern}</h4>
                  <p className="mb-3 text-sm text-purple-800">{pattern.description}</p>
                  {pattern.examples && pattern.examples.length > 0 && (
                    <div className="mt-3 border-t border-purple-200 pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-700">Examples:</p>
                      <ul className="space-y-1">
                        {pattern.examples.map((example, exIndex) => (
                          <li key={exIndex} className="text-xs text-purple-600">
                            • "{example}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback Recommendations if AI didn't generate any */}
        {(!analysis.recommendations || analysis.recommendations.length === 0) && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-blue-900">
              <Info className="h-5 w-5" />
              General Recommendations
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              {analysis.risk_score >= 80 && (
                <>
                  <p>• <strong>CRITICAL:</strong> Consider seeking immediate legal advice and support</p>
                  <p>• Document all interactions and save evidence</p>
                  <p>• Contact a trusted friend or family member</p>
                  <p>• Consider filing a police complaint if threats are involved</p>
                </>
              )}
              {analysis.risk_score >= 60 && analysis.risk_score < 80 && (
                <>
                  <p>• <strong>HIGH RISK:</strong> Be cautious and document all interactions</p>
                  <p>• Consider consulting with a lawyer</p>
                  <p>• Save all evidence and communications</p>
                  <p>• Avoid engaging in arguments or confrontations</p>
                </>
              )}
              {analysis.risk_score >= 40 && analysis.risk_score < 60 && (
                <>
                  <p>• <strong>MODERATE RISK:</strong> Monitor the situation closely</p>
                  <p>• Keep records of concerning messages</p>
                  <p>• Stay aware of any escalation patterns</p>
                </>
              )}
              {analysis.risk_score < 40 && (
                <>
                  <p>• <strong>LOW RISK:</strong> Continue to stay vigilant</p>
                  <p>• Monitor for any changes in behavior</p>
                  <p>• Keep records of important communications</p>
                </>
              )}
              <p className="mt-4 text-xs text-blue-700">
                <strong>Note:</strong> This analysis is for informational purposes only and does not constitute legal advice. Please consult with a qualified legal professional for specific situations.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

