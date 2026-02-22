import { useEffect, useState, useRef } from 'react'
import { BarChart3, Users, Activity, TrendingUp, AlertTriangle, Crown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format } from 'date-fns'
import { AdminLayout } from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { getEdgeFunctionUrl, authHeaders } from '../../lib/api'
import { useDarkMode } from '../../hooks/useDarkMode'

interface Feature {
  name: string
  key: string
  totalActions: number
  uniqueUsers: number
}

interface TopUser {
  id: string
  email: string
  name: string
  gender: string
  totalActions: number
}

interface FeatureData {
  features: Feature[]
  activityTrend: Array<Record<string, any>>
  topUsers: TopUser[]
  totalActions: number
}

const FEATURE_COLORS: Record<string, string> = {
  'Consent Vault': '#3b82f6',
  'Red Flag Radar': '#ef4444',
  'Income Tracker': '#10b981',
  'DV Incident Log': '#f59e0b',
  'Dowry Vault': '#8b5cf6',
  'Breakup Generator': '#ec4899',
  'Maintenance Calc': '#06b6d4',
}

export default function FeatureUsagePage() {
  const { sessionToken } = useAuth()
  const { dark } = useDarkMode()
  const [data, setData] = useState<FeatureData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const fetchingRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      if (fetchingRef.current || !sessionToken) return
      fetchingRef.current = true
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`${getEdgeFunctionUrl('admin')}/feature-usage`, {
          headers: authHeaders(sessionToken),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        if (json.ok) setData(json.data)
        else throw new Error('Unexpected response')
      } catch (err: any) {
        if (err.name === 'AbortError') return
        setError(err.message || 'Failed to load')
      } finally {
        setLoading(false)
        fetchingRef.current = false
      }
    }
    load()
    return () => controller.abort()
  }, [sessionToken])

  const tooltipStyle = {
    backgroundColor: dark ? '#000' : '#fff',
    color: dark ? '#fff' : '#111',
    border: dark ? '1px solid #374151' : '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: 11,
    padding: '6px 10px',
  }
  const axisStroke = dark ? '#4b5563' : '#d1d5db'
  const cursorStyle = { fill: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }

  const mostUsed = data?.features[0]

  return (
    <AdminLayout title="Feature Usage" subtitle="What users are using and how often">
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          [0, 1, 2, 3].map(i => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
              <div className="space-y-2"><div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-8 w-14 rounded bg-gray-200 dark:bg-gray-700" /></div>
            </div>
          ))
        ) : data ? (
          <>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Actions</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{data.totalActions.toLocaleString()}</p>
                </div>
                <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-900/20"><Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Features Active</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{data.features.filter(f => f.totalActions > 0).length} / {data.features.length}</p>
                </div>
                <div className="rounded-lg p-2.5 bg-purple-50 dark:bg-purple-900/20"><BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" /></div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Most Used</p>
                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white truncate">{mostUsed?.name || '—'}</p>
                </div>
                <div className="rounded-lg p-2.5 bg-amber-50 dark:bg-amber-900/20"><Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Active Users</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{data.topUsers.length}</p>
                </div>
                <div className="rounded-lg p-2.5 bg-green-50 dark:bg-green-900/20"><Users className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Feature Breakdown + Activity Trend */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Feature Breakdown */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Feature Breakdown</h3>
          {loading ? (
            <div className="space-y-3">
              {[0,1,2,3,4].map(i => <div key={i} className="animate-pulse"><div className="mb-1 h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-6 rounded-full bg-gray-100 dark:bg-gray-800" /></div>)}
            </div>
          ) : data ? (
            <>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.features} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
                    <XAxis type="number" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} width={110} />
                    <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                    <Bar dataKey="totalActions" name="Total Actions" radius={[0, 6, 6, 0]} maxBarSize={24}>
                      {data.features.map((f) => (
                        <Cell key={f.key} fill={FEATURE_COLORS[f.name] || '#6b7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {data.features.map(f => {
                  const pct = data.totalActions > 0 ? (f.totalActions / data.totalActions * 100) : 0
                  return (
                    <div key={f.key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FEATURE_COLORS[f.name] || '#6b7280' }} />
                        <span className="font-medium text-gray-700 dark:text-gray-300">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 dark:text-gray-400">{f.uniqueUsers} users</span>
                        <span className="font-semibold text-gray-900 dark:text-white w-12 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}
        </div>

        {/* Activity Trend */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Daily Activity (Last 14 Days)</h3>
          {loading ? (
            <div className="h-[280px] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ) : data && data.activityTrend.length > 0 ? (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.activityTrend.map(d => ({
                    ...d,
                    date: (() => { try { return format(new Date(d.date), 'MMM d') } catch { return d.date } })(),
                  }))}
                  margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
                  barCategoryGap="15%"
                >
                  <XAxis dataKey="date" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                  <Bar dataKey="Consent Vault" stackId="a" fill="#3b82f6" name="Consent Vault" />
                  <Bar dataKey="Red Flag Radar" stackId="a" fill="#ef4444" name="Red Flag Radar" />
                  <Bar dataKey="Income Tracker" stackId="a" fill="#10b981" name="Income Tracker" />
                  <Bar dataKey="Breakup Generator" stackId="a" fill="#ec4899" name="Breakup Generator" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-gray-400">No activity data available</p>
          )}
          {data && data.activityTrend.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {[
                { label: 'Consent Vault', color: '#3b82f6' },
                { label: 'Red Flag Radar', color: '#ef4444' },
                { label: 'Income Tracker', color: '#10b981' },
                { label: 'Breakup Generator', color: '#ec4899' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Users */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Most Active Users</h3>
          <TrendingUp className="h-4 w-4 text-gray-400" />
        </div>
        {loading ? (
          <div className="space-y-3">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="flex-1 space-y-1"><div className="h-3 w-40 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-2.5 w-24 rounded bg-gray-200 dark:bg-gray-700" /></div>
                <div className="h-6 w-12 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        ) : data && data.topUsers.length > 0 ? (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[500px] text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">#</th>
                  <th className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">User</th>
                  <th className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Gender</th>
                  <th className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Total Actions</th>
                  <th className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {data.topUsers.map((u, i) => {
                  const pct = data.totalActions > 0 ? (u.totalActions / data.totalActions * 100) : 0
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                      <td className="px-5 py-2.5 text-xs font-semibold text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            {(u.name || u.email)[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{u.name || u.email}</p>
                            {u.name && <p className="text-[10px] text-gray-400 truncate">{u.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-block rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium capitalize text-gray-600 dark:text-gray-400">
                          {u.gender || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{u.totalActions}</span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(pct * 2, 100)}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-10 text-right font-mono">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-gray-400">No user activity data yet</p>
        )}
      </div>
    </AdminLayout>
  )
}
