import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, Receipt, Plus, BookOpen, AlertCircle, IndianRupee } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { getEdgeFunctionUrl, apiFetch } from '../../../lib/api'

interface MaintenanceSummary {
  totalCalculations: number
  totalExpenses: number
  totalMonthlyExpenses: number
  latestMaintenance: number
  byCategory: Record<string, { count: number; monthlyTotal: number }>
  latestCalculation: { id: string; total_maintenance: number; percentage_applied: number; created_at: string } | null
}

const CATEGORY_LABELS: Record<string, string> = {
  education: 'Education',
  medical: 'Medical',
  housing: 'Housing',
  food: 'Food & Groceries',
  clothing: 'Clothing',
  transport: 'Transport',
  childcare: 'Childcare',
  utilities: 'Utilities',
  legal: 'Legal Fees',
  other: 'Other',
}

export default function MaintenanceDashboard() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null)
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
      const res = await apiFetch(`${getEdgeFunctionUrl('maintenance')}/summary`, sessionToken, {
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
    <DashboardLayout title="Maintenance Calculator" subtitle="Calculate & document your maintenance rights" backHref="/dashboard">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm dark:bg-black dark:border-red-700/40 dark:text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-lg border border-teal-200/20 bg-teal-50/50 p-3 sm:p-4 shadow-sm dark:bg-black dark:border-teal-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">Latest Maintenance</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-teal-700 dark:text-teal-300">
                {summary?.latestMaintenance ? formatCurrency(summary.latestMaintenance) : '—'}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">per month</p>
            </div>
            <div className="rounded-lg border border-gray-200/20 bg-white/50 p-3 sm:p-4 shadow-sm dark:bg-black dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Calculations</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{summary?.totalCalculations ?? 0}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">saved scenarios</p>
            </div>
            <div className="rounded-lg border border-rose-200/20 bg-rose-50/50 p-3 sm:p-4 shadow-sm dark:bg-black dark:border-rose-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">Monthly Expenses</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-rose-700 dark:text-rose-300">{formatCurrency(summary?.totalMonthlyExpenses ?? 0)}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">documented</p>
            </div>
            <div className="rounded-lg border border-blue-200/20 bg-blue-50/50 p-3 sm:p-4 shadow-sm dark:bg-black dark:border-blue-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Expense Items</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-300">{summary?.totalExpenses ?? 0}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">recorded</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={() => navigate('/dashboard/maintenance/calculate')}
            className="group flex items-center gap-4 rounded-xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100/50 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition-all text-left dark:from-black dark:to-black dark:border-teal-700"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white group-hover:scale-105 transition-transform">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Calculate Maintenance</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Based on husband's income</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/maintenance/expenses')}
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white/60 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left dark:bg-black dark:border-gray-700"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:scale-105 transition-transform dark:bg-gray-800 dark:text-gray-400">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Log Expenses</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Education, medical & more</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/maintenance/rights')}
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white/60 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left dark:bg-black dark:border-gray-700"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:scale-105 transition-transform dark:bg-gray-800 dark:text-gray-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Know Your Rights</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Legal provisions & case law</p>
            </div>
          </button>
        </div>

        {/* Expense Breakdown */}
        {!loading && summary && Object.keys(summary.byCategory).length > 0 && (
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-4 sm:p-6 shadow-sm dark:bg-black dark:border-gray-700">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <IndianRupee className="h-4 w-4" />
              Expense Breakdown (Monthly)
            </h3>
            <div className="space-y-3">
              {Object.entries(summary.byCategory)
                .sort(([, a], [, b]) => b.monthlyTotal - a.monthlyTotal)
                .map(([cat, data]) => {
                  const pct = summary.totalMonthlyExpenses > 0 ? (data.monthlyTotal / summary.totalMonthlyExpenses) * 100 : 0
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{CATEGORY_LABELS[cat] || cat}</span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {data.count} item{data.count !== 1 ? 's' : ''} · {formatCurrency(Math.round(data.monthlyTotal))}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all"
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
        {!loading && summary && summary.totalCalculations === 0 && summary.totalExpenses === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 sm:p-12 text-center dark:bg-black dark:border-gray-600">
            <Calculator className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No calculations yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Calculate your maintenance entitlement based on husband's income.</p>
            <button
              onClick={() => navigate('/dashboard/maintenance/calculate')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Start Calculation
            </button>
          </div>
        )}

        {/* Legal Info */}
        <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4 sm:p-5 dark:bg-black dark:border-teal-700">
          <h3 className="mb-2 font-semibold text-teal-900 dark:text-teal-300">About Maintenance Calculator</h3>
          <ul className="space-y-1.5 text-sm text-teal-800 dark:text-teal-300">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Calculates maintenance as per Indian court guidelines (Rajnesh v. Neha, 2020)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Document expenses to strengthen your case: education, medical, housing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Covers Section 125 CrPC, Hindu Marriage Act, and DV Act provisions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>All calculations are estimates - consult a lawyer for your specific case</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}
