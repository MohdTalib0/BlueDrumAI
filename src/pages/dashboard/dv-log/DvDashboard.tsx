import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, Plus, Clock, FileHeart, AlertCircle } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { getEdgeFunctionUrl } from '../../../lib/api'

interface DvSummary {
  totalIncidents: number
  totalMedicalReports: number
  byType: Record<string, number>
  latestIncident: { id: string; incident_date: string; incident_type: string } | null
}

const TYPE_LABELS: Record<string, string> = {
  physical: 'Physical',
  emotional: 'Emotional',
  financial: 'Financial',
  sexual: 'Sexual',
  threat: 'Threats',
  other: 'Other',
}

const TYPE_COLORS: Record<string, string> = {
  physical: 'bg-red-500',
  emotional: 'bg-orange-500',
  financial: 'bg-yellow-500',
  sexual: 'bg-rose-500',
  threat: 'bg-purple-500',
  other: 'bg-gray-400',
}

export default function DvDashboard() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DvSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    loadSummary(controller.signal)
    return () => { controller.abort() }
  }, [])

  const loadSummary = async (signal?: AbortSignal) => {
    try {
      if (!sessionToken) return
      const res = await fetch(`${getEdgeFunctionUrl('dv')}/summary`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
        signal,
      })
      if (!res.ok) throw new Error('Failed to load summary')
      const data = await res.json()
      setSummary(data.summary)
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  const totalByType = summary ? Object.values(summary.byType).reduce((s, v) => s + v, 0) : 0

  return (
    <DashboardLayout title="DV Incident Log" subtitle="Document incidents, medical reports & evidence" backHref="/dashboard">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm dark:bg-black dark:border-red-700/40 dark:text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-red-200/30 bg-red-50/50 p-3 sm:p-4 shadow-sm dark:bg-black dark:border-red-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">Incidents Logged</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-red-700 dark:text-red-300">{summary?.totalIncidents ?? 0}</p>
            </div>
            <div className="rounded-lg border border-blue-200/30 bg-blue-50/50 p-3 sm:p-4 shadow-sm dark:bg-black dark:border-blue-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Medical Reports</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-300">{summary?.totalMedicalReports ?? 0}</p>
            </div>
            <div className="col-span-2 lg:col-span-1 rounded-lg border border-gray-200/30 bg-white/50 p-3 sm:p-4 shadow-sm dark:bg-black dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Incident Types</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{Object.keys(summary?.byType ?? {}).length}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={() => navigate('/dashboard/dv-log/add')}
            className="group flex items-center gap-4 rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-red-300 transition-all text-left dark:from-black dark:to-black dark:border-red-700 dark:hover:border-red-500"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white group-hover:scale-105 transition-transform">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Log Incident</p>
              <p className="text-xs text-gray-500 mt-0.5 dark:text-gray-400">Document what happened</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/dv-log/timeline')}
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white/60 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left dark:bg-black dark:border-gray-700 dark:hover:border-gray-500"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:scale-105 transition-transform dark:bg-gray-800 dark:text-gray-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Incident Timeline</p>
              <p className="text-xs text-gray-500 mt-0.5 dark:text-gray-400">View all documented incidents</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/dv-log/medical')}
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white/60 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left dark:bg-black dark:border-gray-700 dark:hover:border-gray-500"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:scale-105 transition-transform dark:bg-gray-800 dark:text-gray-400">
              <FileHeart className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Medical Reports</p>
              <p className="text-xs text-gray-500 mt-0.5 dark:text-gray-400">Organize medical documentation</p>
            </div>
          </button>
        </div>

        {/* Breakdown by Type */}
        {!loading && summary && totalByType > 0 && (
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-4 sm:p-6 shadow-sm dark:bg-black dark:border-gray-700">
            <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Incidents by Type</h3>
            <div className="space-y-3">
              {Object.entries(summary.byType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const pct = totalByType > 0 ? (count / totalByType) * 100 : 0
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{TYPE_LABELS[type] || type}</span>
                        <span className="text-gray-500 dark:text-gray-400">{count} incident{count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all ${TYPE_COLORS[type] || 'bg-gray-400'}`}
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && summary && summary.totalIncidents === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 sm:p-12 text-center dark:bg-black dark:border-gray-700">
            <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No incidents logged</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">If you're experiencing domestic violence, document every incident here.</p>
            <button
              onClick={() => navigate('/dashboard/dv-log/add')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Log First Incident
            </button>
          </div>
        )}

        {/* Safety Info */}
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 sm:p-5 dark:bg-black dark:border-red-700/40">
          <h3 className="mb-2 font-semibold text-red-900 dark:text-red-300">Important Safety Information</h3>
          <ul className="space-y-1.5 text-sm text-red-800 dark:text-red-300">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>If you are in immediate danger, call <strong>100</strong> (Police) or <strong>181</strong> (Women Helpline)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Document every incident with dates, times, and details as soon as it's safe to do so</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Preserve medical reports and photographs of injuries as legal evidence</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>You can file a complaint under the Protection of Women from Domestic Violence Act, 2005</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}
