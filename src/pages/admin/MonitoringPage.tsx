import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw, Server, Wifi, XCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format } from 'date-fns'
import { AdminLayout } from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { getEdgeFunctionUrl, apiFetch } from '../../lib/api'
import { useDarkMode } from '../../hooks/useDarkMode'

interface ServiceHealth {
  name: string
  status: 'operational' | 'degraded' | 'down'
  latency: number
  detail?: string
}

interface HealthData {
  services: ServiceHealth[]
  overallStatus: 'operational' | 'degraded' | 'down'
  checkedAt: string
}

interface EndpointStat {
  name: string
  calls: number
  errors: number
  avgMs: number
  errorRate: number
}

interface RecentError {
  id: string
  endpoint: string
  status_code: number
  method: string
  error_message: string
  ip_address: string
  response_time_ms: number
  created_at: string
}

interface MonitoringData {
  summary: {
    totalRequests: number
    errorCount: number
    errorRate: number
    avgResponseTime: number
    hoursBack: number
  }
  endpoints: EndpointStat[]
  requestTrend: Array<{ hour: string; total: number; errors: number }>
  statusCodes: Record<number, number>
  recentErrors: RecentError[]
}

const HOURS_OPTIONS = [1, 6, 12, 24, 48, 72]

const STATUS_CONFIG = {
  operational: { label: 'Operational', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/40', dot: 'bg-emerald-500', icon: CheckCircle2 },
  degraded: { label: 'Degraded', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/40', dot: 'bg-amber-500', icon: AlertTriangle },
  down: { label: 'Down', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/40', dot: 'bg-red-500', icon: XCircle },
}

export default function MonitoringPage() {
  const { sessionToken } = useAuth()
  const { dark } = useDarkMode()
  const [data, setData] = useState<MonitoringData | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hoursBack, setHoursBack] = useState(24)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const fetchingRef = useRef(false)
  const healthRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  const fetchHealth = useCallback(async () => {
    if (healthRef.current || !sessionToken) return
    healthRef.current = true
    setLoadingHealth(true)
    try {
      const res = await apiFetch(`${getEdgeFunctionUrl('admin')}/health-check`, sessionToken)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.ok) setHealth(json.data)
    } catch { /* health check failure is non-critical */ }
    finally { setLoadingHealth(false); healthRef.current = false }
  }, [sessionToken])

  const fetchData = useCallback(async (hours: number) => {
    if (fetchingRef.current || !sessionToken) return
    fetchingRef.current = true
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch(`${getEdgeFunctionUrl('admin')}/monitoring?hours=${hours}`, sessionToken)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.ok) setData(json.data)
      else throw new Error('Unexpected response')
    } catch (err: any) {
      setError(err.message || 'Failed to load monitoring data')
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [sessionToken])

  useEffect(() => { fetchHealth() }, [fetchHealth])
  useEffect(() => { fetchData(hoursBack) }, [fetchData, hoursBack])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => { fetchData(hoursBack); fetchHealth() }, 30_000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, fetchData, fetchHealth, hoursBack])

  const tooltipStyle = {
    backgroundColor: dark ? '#000' : '#fff',
    color: dark ? '#fff' : '#111',
    border: dark ? '1px solid #374151' : '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: 11,
    padding: '6px 10px',
  }
  const axisStroke = dark ? '#4b5563' : '#d1d5db'

  const statusColors: Record<string, string> = { '2': '#10b981', '3': '#3b82f6', '4': '#f59e0b', '5': '#ef4444' }
  const statusCodeChart = data ? Object.entries(data.statusCodes).map(([code, count]) => ({
    code: `${code}`,
    count,
    fill: statusColors[code[0]] || '#6b7280',
  })).sort((a, b) => a.code.localeCompare(b.code)) : []

  const summaryCards = data ? [
    { label: 'Total Requests', value: data.summary.totalRequests.toLocaleString(), icon: Server, accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Error Count', value: data.summary.errorCount.toLocaleString(), icon: XCircle, accent: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Error Rate', value: `${data.summary.errorRate}%`, icon: AlertTriangle, accent: data.summary.errorRate > 5 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400', bg: data.summary.errorRate > 5 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Avg Response', value: `${data.summary.avgResponseTime}ms`, icon: Clock, accent: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ] : []

  return (
    <AdminLayout title="System Monitoring" subtitle="API health, error rates, and endpoint performance">
      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-1">
          {HOURS_OPTIONS.map(h => (
            <button
              key={h}
              onClick={() => setHoursBack(h)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                hoursBack === h ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchData(hoursBack)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={() => setAutoRefresh(p => !p)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            autoRefresh
              ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-gray-600 dark:text-gray-400'
          }`}
        >
          <Wifi className="h-3.5 w-3.5" />
          Auto {autoRefresh ? 'ON' : 'OFF'}
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ══════════ Service Health Status ══════════ */}
      <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Service Status</h3>
            {health && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_CONFIG[health.overallStatus].bg} ${STATUS_CONFIG[health.overallStatus].color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[health.overallStatus].dot} ${health.overallStatus === 'operational' ? 'animate-pulse' : ''}`} />
                {health.overallStatus === 'operational' ? 'All Systems Operational' : health.overallStatus === 'degraded' ? 'Partial Degradation' : 'Service Outage'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {health?.checkedAt && (
              <span className="text-[10px] text-gray-400">
                Checked {(() => { try { return format(new Date(health.checkedAt), 'HH:mm:ss') } catch { return '' } })()}
              </span>
            )}
            <button onClick={fetchHealth} disabled={loadingHealth}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loadingHealth && !health ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0,1,2,3,4,5,6,7].map(i => (
              <div key={i} className="animate-pulse rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                <div className="h-5 w-16 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        ) : health ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {health.services.map(svc => {
              const cfg = STATUS_CONFIG[svc.status]
              const StatusIcon = cfg.icon
              return (
                <div key={svc.name} className={`rounded-lg border p-3 transition-all hover:shadow-sm ${cfg.border} ${cfg.bg}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{svc.name}</span>
                    <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${cfg.color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">{svc.latency}ms</span>
                  </div>
                  {svc.detail && svc.status !== 'operational' && (
                    <p className="mt-1.5 text-[10px] text-gray-500 dark:text-gray-400 truncate" title={svc.detail}>{svc.detail}</p>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading && !data
          ? [0, 1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
                <div className="space-y-2"><div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-8 w-14 rounded bg-gray-200 dark:bg-gray-700" /></div>
              </div>
            ))
          : summaryCards.map(c => {
              const Icon = c.icon
              return (
                <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{c.label}</p>
                      <p className={`mt-2 text-2xl font-bold font-mono ${c.accent}`}>{c.value}</p>
                    </div>
                    <div className={`rounded-lg p-2.5 ${c.bg}`}><Icon className={`h-5 w-5 ${c.accent}`} /></div>
                  </div>
                </div>
              )
            })}
      </div>

      {/* Charts Row */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Request Trend */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Request Volume</h3>
          {!data ? (
            <div className="h-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ) : data.requestTrend.length > 0 ? (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.requestTrend} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barCategoryGap="15%">
                  <XAxis dataKey="hour" stroke={axisStroke} fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="total" fill={dark ? '#3b82f6' : '#2563eb'} name="Total" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="errors" fill="#ef4444" name="Errors" radius={[4, 4, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No request data in this window</p>
          )}
        </div>

        {/* Status Code Breakdown */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Status Codes</h3>
          {!data ? (
            <div className="h-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ) : statusCodeChart.length > 0 ? (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusCodeChart} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barCategoryGap="20%">
                  <XAxis dataKey="code" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {statusCodeChart.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No data</p>
          )}
        </div>
      </div>

      {/* Endpoint Performance Table */}
      <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Endpoint Performance</h3>
        {!data ? (
          <div className="space-y-3">{[0,1,2,3].map(i => <div key={i} className="h-8 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />)}</div>
        ) : data.endpoints.length > 0 ? (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Endpoint</th>
                  <th className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Calls</th>
                  <th className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Errors</th>
                  <th className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Error Rate</th>
                  <th className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Avg Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {data.endpoints.map(ep => (
                  <tr key={ep.name} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                    <td className="px-5 py-2.5 font-mono text-xs text-gray-900 dark:text-white">{ep.name}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-700 dark:text-gray-300">{ep.calls.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      <span className={ep.errors > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}>{ep.errors}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        ep.errorRate > 10 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : ep.errorRate > 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {ep.errorRate}%
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs text-gray-600 dark:text-gray-400">{ep.avgMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-gray-400">No endpoint data available</p>
        )}
      </div>

      {/* Recent Errors */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Errors</h3>
          {data && <span className="text-[10px] font-medium text-gray-400">{data.recentErrors.length} errors</span>}
        </div>
        {!data ? (
          <div className="space-y-3">{[0,1,2,3].map(i => <div key={i} className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />)}</div>
        ) : data.recentErrors.length > 0 ? (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Time</th>
                  <th className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Method</th>
                  <th className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Endpoint</th>
                  <th className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Error</th>
                  <th className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {data.recentErrors.slice(0, 25).map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                    <td className="px-5 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {(() => { try { return format(new Date(e.created_at), 'MMM d HH:mm:ss') } catch { return '—' } })()}
                    </td>
                    <td className="px-3 py-2.5"><span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 dark:text-gray-400">{e.method}</span></td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-900 dark:text-white truncate max-w-[200px]">{e.endpoint}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        e.status_code >= 500 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>{e.status_code}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{e.error_message || '—'}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs text-gray-500">{e.response_time_ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10">
            <Activity className="h-10 w-10 text-green-300 dark:text-green-800 mb-3" />
            <p className="text-sm font-medium text-green-600 dark:text-green-400">No errors in the last {hoursBack}h</p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
