import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, MessageSquare, Cpu, DollarSign, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { AdminLayout } from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { getEdgeFunctionUrl, authHeaders } from '../../lib/api'
import { useDarkMode } from '../../hooks/useDarkMode'

interface RecentUser {
  id: string
  email: string
  first_name: string
  last_name: string
  gender: string
  role: string
  created_at: string
  onboarding_completed: boolean
}

interface AdminStats {
  totalUsers: number
  totalFeedback: number
  openFeedback: number
  totalTokens: number
  totalCost: number
  genderBreakdown: Record<string, number>
  serviceBreakdown: Record<string, number>
  signupTrend: Array<{ date: string; count: number }>
  recentUsers: RecentUser[]
}

export default function AdminDashboard() {
  const { sessionToken } = useAuth()
  const { dark } = useDarkMode()
  const navigate = useNavigate()

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const fetchingRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchStats() {
      if (fetchingRef.current || !sessionToken) return
      fetchingRef.current = true
      setLoading(true)
      setError('')

      try {
        const res = await fetch(`${getEdgeFunctionUrl('admin')}/stats`, {
          headers: authHeaders(sessionToken),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch admin stats')
        const data = await res.json()
        if (data.ok) setStats(data.stats)
        else throw new Error('Unexpected response')
      } catch (err: any) {
        if (err.name === 'AbortError') return
        setError(err.message || 'Failed to load admin dashboard')
      } finally {
        setLoading(false)
        fetchingRef.current = false
      }
    }

    fetchStats()
    return () => controller.abort()
  }, [sessionToken])

  const tooltipStyle = {
    backgroundColor: '#000',
    color: '#fff',
    border: '1px solid #374151',
    borderRadius: '8px',
    fontSize: 11,
    padding: '6px 10px',
  }
  const axisStroke = dark ? '#4b5563' : '#d1d5db'
  const cursorStyle = { fill: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }

  const genderColors: Record<string, string> = { male: '#3b82f6', female: '#ec4899', both: '#8b5cf6' }

  const statCards = stats
    ? [
        { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: 'Open Feedback', value: stats.openFeedback.toLocaleString(), icon: MessageSquare, accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        { label: 'AI Tokens Used', value: stats.totalTokens.toLocaleString(), icon: Cpu, accent: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        { label: 'AI Cost', value: `$${stats.totalCost.toFixed(2)}`, icon: DollarSign, accent: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
      ]
    : []

  return (
    <AdminLayout title="Overview" subtitle="Platform metrics at a glance">
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? [0, 1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-8 w-14 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))
          : statCards.map(({ label, value, icon: Icon, accent, bg }) => (
              <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${bg}`}>
                    <Icon className={`h-5 w-5 ${accent}`} />
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Signup Trend */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Signup Trend</h3>
            {loading ? (
              <div className="h-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            ) : stats && stats.signupTrend.length > 0 ? (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.signupTrend.map((d) => ({
                      date: (() => { try { return format(new Date(d.date), 'MMM d') } catch { return d.date } })(),
                      count: d.count,
                    }))}
                    margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
                    barCategoryGap="20%"
                  >
                    <XAxis dataKey="date" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} cursor={cursorStyle} />
                    <Bar dataKey="count" fill={dark ? '#6366f1' : '#4f46e5'} radius={[6, 6, 0, 0]} name="Signups" maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">No signup data available</p>
            )}
          </div>

          {/* Gender Breakdown */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Gender Breakdown</h3>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="mb-1 h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-5 rounded-full bg-gray-100 dark:bg-gray-800" />
                  </div>
                ))}
              </div>
            ) : stats ? (
              <div className="space-y-3">
                {Object.entries(stats.genderBreakdown).map(([gender, count]) => {
                  const total = Object.values(stats.genderBreakdown).reduce((a, b) => a + b, 0)
                  const pct = total > 0 ? (count / total) * 100 : 0
                  return (
                    <div key={gender}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium capitalize text-gray-600 dark:text-gray-400">{gender}</span>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: genderColors[gender] || '#6b7280' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right column — Recent Users */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Users</h3>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex animate-pulse items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-2.5 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats && stats.recentUsers.length > 0 ? (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full min-w-[480px] text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Email</th>
                    <th className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Name</th>
                    <th className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Gender</th>
                    <th className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Role</th>
                    <th className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {stats.recentUsers.slice(0, 8).map((u) => (
                    <tr key={u.id} className="group hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                      <td className="px-5 py-2.5 text-xs text-gray-700 dark:text-gray-300 truncate max-w-[160px]">{u.email}</td>
                      <td className="px-3 py-2.5 text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-block rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium capitalize text-gray-600 dark:text-gray-400">
                          {u.gender || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          u.role === 'super_admin'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : u.role === 'admin'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-xs text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">
                        {(() => { try { return format(new Date(u.created_at), 'MMM d, yyyy') } catch { return '—' } })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No users yet</p>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
