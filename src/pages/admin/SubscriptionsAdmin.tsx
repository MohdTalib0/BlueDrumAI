import { useEffect, useRef, useState } from 'react'
import { CreditCard, Crown, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { AdminLayout } from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { getEdgeFunctionUrl, apiFetch } from '../../lib/api'
import { useDarkMode } from '../../hooks/useDarkMode'

interface RecentSubscription {
  id: string
  user_id: string
  user_name: string
  plan: string
  status: string
  created_at: string
}

interface SubscriptionData {
  totalSubscriptions: number
  planCounts: Record<string, number>
  statusCounts: Record<string, number>
  usageTotals: {
    analyses: number
    exports: number
    uploads: number
    breakups: number
    redFlags: number
  }
  usageTrend: Array<{ month: string; analyses: number; exports: number; uploads: number }>
  recentSubscriptions: RecentSubscription[]
}

const STATUS_COLORS: Record<string, { dot: string; badge: string }> = {
  active:   { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled:{ dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  past_due: { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  expired:  { dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

const PLAN_BADGE: Record<string, string> = {
  free:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  premium: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

const USAGE_ITEMS = [
  { key: 'analyses', label: 'AI Analyses',      color: '#6366f1' },
  { key: 'exports',  label: 'PDF Exports',      color: '#10b981' },
  { key: 'uploads',  label: 'Vault Uploads',    color: '#f59e0b' },
  { key: 'breakups', label: 'Breakup Messages',  color: '#ef4444' },
  { key: 'redFlags', label: 'Red Flags',         color: '#ec4899' },
] as const

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b']

export default function SubscriptionsAdmin() {
  const { sessionToken } = useAuth()
  const { dark } = useDarkMode()

  const [data, setData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const fetchingRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchData() {
      if (fetchingRef.current || !sessionToken) return
      fetchingRef.current = true
      setLoading(true)
      setError('')

      try {
        const res = await apiFetch(`${getEdgeFunctionUrl('admin')}/subscriptions`, sessionToken, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch subscription data')
        const json = await res.json()
        if (json.ok) setData(json.data)
        else throw new Error('Unexpected response')
      } catch (err: any) {
        if (err.name === 'AbortError') return
        setError(err.message || 'Failed to load subscriptions')
      } finally {
        setLoading(false)
        fetchingRef.current = false
      }
    }

    fetchData()
    return () => controller.abort()
  }, [sessionToken])

  const tooltipStyle = dark
    ? { backgroundColor: '#000', color: '#fff', border: '1px solid #374151', borderRadius: '8px', fontSize: 11, padding: '6px 10px' }
    : { backgroundColor: '#fff', color: '#111', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 11, padding: '6px 10px' }
  const axisStroke = dark ? '#4b5563' : '#d1d5db'
  const cursorStyle = { fill: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }

  const total = data?.totalSubscriptions ?? 0
  const premium = data?.planCounts?.premium ?? 0
  const free = data?.planCounts?.free ?? 0
  const conversionRate = total > 0 ? ((premium / total) * 100).toFixed(1) : '0.0'

  const summaryCards = [
    { label: 'Total Subscriptions', value: total.toLocaleString(), icon: CreditCard, accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Premium Users', value: premium.toLocaleString(), icon: Crown, accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Free Users', value: free.toLocaleString(), icon: Users, accent: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
    { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, accent: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ]

  const freePct = total > 0 ? (free / total) * 100 : 0
  const premiumPct = total > 0 ? (premium / total) * 100 : 0

  const usageTotals = data?.usageTotals
  const maxUsage = usageTotals
    ? Math.max(...USAGE_ITEMS.map(i => usageTotals[i.key] ?? 0), 1)
    : 1

  return (
    <AdminLayout title="Subscriptions" subtitle="Manage plans, usage & billing">
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? [0, 1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-8 w-14 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))
          : summaryCards.map(({ label, value, icon: Icon, accent, bg }) => (
              <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                    <p className={`mt-2 text-2xl font-bold ${label === 'Premium Users' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{value}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${bg}`}>
                    <Icon className={`h-5 w-5 ${accent}`} />
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Plan Distribution */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
            <h3 className="mb-5 text-sm font-semibold text-gray-900 dark:text-white">Plan Distribution</h3>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[0, 1].map(i => (
                  <div key={i} className="animate-pulse rounded-xl border border-gray-100 dark:border-gray-800 p-5">
                    <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700 mb-3" />
                    <div className="h-8 w-12 rounded bg-gray-200 dark:bg-gray-700 mb-3" />
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Free</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{free}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{freePct.toFixed(1)}% of total</p>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full rounded-full bg-gray-400 dark:bg-gray-500 transition-all duration-700" style={{ width: `${freePct}%` }} />
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 p-5 bg-amber-50/30 dark:bg-amber-900/10">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">Premium</p>
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{premium}</p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mb-3">{premiumPct.toFixed(1)}% of total</p>
                  <div className="h-2 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <div className="h-full rounded-full bg-amber-500 transition-all duration-700" style={{ width: `${premiumPct}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Breakdown */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Status Breakdown</h3>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex animate-pulse items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="ml-auto h-3 w-8 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))}
              </div>
            ) : data ? (
              <div className="space-y-3">
                {Object.entries(data.statusCounts).map(([status, count]) => {
                  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.expired
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                        <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{status.replace('_', ' ')}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{count.toLocaleString()}</span>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right column — Platform Usage */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
          <h3 className="mb-5 text-sm font-semibold text-gray-900 dark:text-white">Platform Usage</h3>
          {loading ? (
            <div className="space-y-5">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="mb-1.5 h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 rounded-full bg-gray-100 dark:bg-gray-800" />
                </div>
              ))}
            </div>
          ) : usageTotals ? (
            <div className="space-y-5">
              {USAGE_ITEMS.map(({ key, label, color }) => {
                const val = usageTotals[key] ?? 0
                const pct = (val / maxUsage) * 100
                return (
                  <div key={key}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{val.toLocaleString()}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* Monthly Usage Trend */}
      <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Monthly Usage Trend</h3>
        {loading ? (
          <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ) : data && data.usageTrend.length > 0 ? (
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.usageTrend.map(d => ({
                  month: (() => { try { return format(new Date(d.month + '-01'), 'MMM yyyy') } catch { return d.month } })(),
                  Analyses: d.analyses,
                  Exports: d.exports,
                  Uploads: d.uploads,
                }))}
                margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
                barCategoryGap="20%"
              >
                <XAxis dataKey="month" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: dark ? '#fff' : '#111' }} cursor={cursorStyle} />
                <Bar dataKey="Analyses" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Exports" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Uploads" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-gray-400">No usage trend data available</p>
        )}
      </div>

      {/* Recent Subscriptions */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Subscriptions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">User</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Plan</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-3"><div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-800" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-800" /></td>
                    <td className="px-5 py-3"><div className="ml-auto h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" /></td>
                  </tr>
                ))
              ) : data && data.recentSubscriptions.length > 0 ? (
                data.recentSubscriptions.map(sub => {
                  const statusStyle = STATUS_COLORS[sub.status]?.badge ?? STATUS_COLORS.expired.badge
                  const planStyle = PLAN_BADGE[sub.plan] ?? PLAN_BADGE.free
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{sub.user_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${planStyle}`}>
                          {sub.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${statusStyle}`}>
                          {sub.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">
                        {(() => { try { return format(new Date(sub.created_at), 'MMM d, yyyy') } catch { return '—' } })()}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <CreditCard className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No subscriptions yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
