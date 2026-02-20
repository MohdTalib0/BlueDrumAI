import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gift, Users, Plus, List, TrendingUp, AlertCircle } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { getEdgeFunctionUrl } from '../../../lib/api'

interface DowrySummary {
  totalEntries: number
  totalValue: number
  totalWitnesses: number
  byType: Record<string, { count: number; value: number }>
  latestEntry: { id: string; created_at: string } | null
}

const TYPE_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  jewelry: 'Jewelry',
  appliances: 'Appliances',
  vehicle: 'Vehicle',
  property: 'Property',
  other: 'Other',
}

export default function DowryDashboard() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DowrySummary | null>(null)
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
      const res = await fetch(`${getEdgeFunctionUrl('dowry')}/summary`, {
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

  const formatCurrency = (v: number) =>
    `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <DashboardLayout title="Dowry Vault" subtitle="Document gifts, transfers & witnesses" backHref="/dashboard">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200/20 bg-white/50 p-3 sm:p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Items</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-gray-900">{summary?.totalEntries ?? 0}</p>
            </div>
            <div className="rounded-lg border border-purple-200/20 bg-purple-50/50 p-3 sm:p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Total Value</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-purple-700">{formatCurrency(summary?.totalValue ?? 0)}</p>
            </div>
            <div className="rounded-lg border border-blue-200/20 bg-blue-50/50 p-3 sm:p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Witnesses</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-blue-700">{summary?.totalWitnesses ?? 0}</p>
            </div>
            <div className="rounded-lg border border-green-200/20 bg-green-50/50 p-3 sm:p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Categories</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-green-700">{Object.keys(summary?.byType ?? {}).length}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={() => navigate('/dashboard/dowry-vault/add')}
            className="group flex items-center gap-4 rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-purple-300 transition-all text-left"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white group-hover:scale-105 transition-transform">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Add Entry</p>
              <p className="text-xs text-gray-500 mt-0.5">Document a gift or transfer</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/dowry-vault/gifts')}
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white/60 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:scale-105 transition-transform">
              <List className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Gift Tracker</p>
              <p className="text-xs text-gray-500 mt-0.5">View all documented items</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/dowry-vault/witnesses')}
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white/60 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Witnesses</p>
              <p className="text-xs text-gray-500 mt-0.5">Manage witness contacts</p>
            </div>
          </button>
        </div>

        {/* Breakdown by Type */}
        {!loading && summary && Object.keys(summary.byType).length > 0 && (
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-4 sm:p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <TrendingUp className="h-4 w-4" />
              Breakdown by Type
            </h3>
            <div className="space-y-3">
              {Object.entries(summary.byType)
                .sort(([, a], [, b]) => b.value - a.value)
                .map(([type, data]) => {
                  const pct = summary.totalValue > 0 ? (data.value / summary.totalValue) * 100 : 0
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{TYPE_LABELS[type] || type}</span>
                        <span className="text-gray-500">
                          {data.count} item{data.count !== 1 ? 's' : ''} · {formatCurrency(data.value)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-500 transition-all"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && summary && summary.totalEntries === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 sm:p-12 text-center">
            <Gift className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700">No entries yet</h3>
            <p className="mt-1 text-sm text-gray-500">Start documenting gifts, transfers, and demands.</p>
            <button
              onClick={() => navigate('/dashboard/dowry-vault/add')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add First Entry
            </button>
          </div>
        )}

        {/* Legal Info */}
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 sm:p-5">
          <h3 className="mb-2 font-semibold text-purple-900">About the Dowry Vault</h3>
          <ul className="space-y-1.5 text-sm text-purple-800">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Document all gifts, cash, jewelry, and property given as dowry</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Track bank transfers and keep receipts as evidence</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Record any verbal or written demands for reference</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Maintain witness contacts who can corroborate your documentation</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}
