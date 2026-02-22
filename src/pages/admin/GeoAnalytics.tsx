import { useEffect, useRef, useState } from 'react'
import { Globe, Wifi, MapPin, Flag } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { AdminLayout } from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { getEdgeFunctionUrl, authHeaders } from '../../lib/api'
import { useDarkMode } from '../../hooks/useDarkMode'

interface CountItem {
  name: string
  count: number
}

interface DeviceInfo {
  device_type: string
  browser: string
  os: string
}

interface LocationInfo {
  country: string
  city: string
}

interface Session {
  id: string
  user_id: string
  user_email: string
  ip_address: string
  user_agent: string
  device_info: DeviceInfo
  location_info: LocationInfo
  is_active: boolean
  last_activity_at: string
  created_at: string
}

interface GeoData {
  totalSessions: number
  activeSessions: number
  countries: CountItem[]
  cities: CountItem[]
  devices: CountItem[]
  browsers: CountItem[]
  operatingSystems: CountItem[]
  sessionTrend: Array<{ date: string; count: number }>
  recentSessions: Session[]
}

function maskIp(ip: string): string {
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`
  return ip
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-8 w-14 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-3">
          <div className="h-3 w-6 rounded bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="flex-1 h-5 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="h-3 w-10 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

export default function GeoAnalytics() {
  const { sessionToken } = useAuth()
  const { dark } = useDarkMode()
  const [data, setData] = useState<GeoData | null>(null)
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
        const res = await fetch(`${getEdgeFunctionUrl('admin')}/geo`, {
          headers: authHeaders(sessionToken),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`Server responded with ${res.status}`)
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

  const topCountry = data?.countries[0]
  const maxCountryCount = data?.countries[0]?.count ?? 1
  const maxCityCount = data?.cities[0]?.count ?? 1
  const maxDeviceCount = data ? Math.max(...data.devices.map(d => d.count), 1) : 1
  const maxBrowserCount = data ? Math.max(...data.browsers.map(b => b.count), 1) : 1
  const maxOsCount = data ? Math.max(...data.operatingSystems.map(o => o.count), 1) : 1

  const COUNTRY_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#818cf8', '#60a5fa', '#38bdf8', '#7dd3fc']
  const CITY_COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#22d3ee', '#2dd4bf', '#34d399', '#4ade80', '#86efac', '#a7f3d0']
  const DEVICE_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6']
  const BROWSER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
  const OS_COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899']

  const cards = data
    ? [
        {
          label: 'Total Sessions',
          value: data.totalSessions.toLocaleString(),
          icon: Globe,
          accent: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
          label: 'Active Sessions',
          value: data.activeSessions.toLocaleString(),
          icon: Wifi,
          accent: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        },
        {
          label: 'Countries',
          value: data.countries.length.toString(),
          icon: MapPin,
          accent: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
          label: 'Top Country',
          value: topCountry?.name ?? '—',
          icon: Flag,
          accent: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-50 dark:bg-amber-900/20',
        },
      ]
    : []

  return (
    <AdminLayout title="Geo & Sessions" subtitle="Geolocation, devices, and session analytics">
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
          <button onClick={() => { fetchingRef.current = false; setError(''); setLoading(true); window.location.reload() }} className="ml-auto text-xs font-medium hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map(card => {
              const Icon = card.icon
              return (
                <div key={card.label} className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{card.label}</span>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                      <Icon className={`h-4 w-4 ${card.accent}`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${card.label === 'Top Country' ? '' : 'font-mono'} ${card.accent}`}>
                    {card.value}
                  </div>
                </div>
              )
            })}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Top Countries */}
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Top Countries</h3>
            {loading ? (
              <SkeletonList />
            ) : data && data.countries.length > 0 ? (
              <div className="space-y-3">
                {data.countries.slice(0, 10).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
                    <span className="text-sm shrink-0">🏳️</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{c.name}</span>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 ml-2 shrink-0">{c.count.toLocaleString()}</span>
                      </div>
                      <ProgressBar value={c.count} max={maxCountryCount} color={COUNTRY_COLORS[i % COUNTRY_COLORS.length]} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">No country data available</p>
            )}
          </div>

          {/* Top Cities */}
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Top Cities</h3>
            {loading ? (
              <SkeletonList />
            ) : data && data.cities.length > 0 ? (
              <div className="space-y-3">
                {data.cities.slice(0, 10).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
                    <span className="text-sm shrink-0">📍</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{c.name}</span>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 ml-2 shrink-0">{c.count.toLocaleString()}</span>
                      </div>
                      <ProgressBar value={c.count} max={maxCityCount} color={CITY_COLORS[i % CITY_COLORS.length]} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">No city data available</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Device Distribution */}
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Device Distribution</h3>
            {loading ? (
              <SkeletonList />
            ) : data && data.devices.length > 0 ? (
              <div className="space-y-4">
                {data.devices.map((d, i) => {
                  const total = data.devices.reduce((s, x) => s + x.count, 0)
                  const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0'
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{d.name}</span>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{d.count.toLocaleString()} ({pct}%)</span>
                      </div>
                      <ProgressBar value={d.count} max={maxDeviceCount} color={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">No device data</p>
            )}
          </div>

          {/* Browser Breakdown */}
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Browser Breakdown</h3>
            {loading ? (
              <SkeletonList />
            ) : data && data.browsers.length > 0 ? (
              <div className="space-y-4">
                {data.browsers.map((b, i) => {
                  const total = data.browsers.reduce((s, x) => s + x.count, 0)
                  const pct = total > 0 ? ((b.count / total) * 100).toFixed(1) : '0'
                  return (
                    <div key={b.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{b.name}</span>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{b.count.toLocaleString()} ({pct}%)</span>
                      </div>
                      <ProgressBar value={b.count} max={maxBrowserCount} color={BROWSER_COLORS[i % BROWSER_COLORS.length]} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">No browser data</p>
            )}
          </div>

          {/* OS Breakdown */}
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">OS Breakdown</h3>
            {loading ? (
              <SkeletonList />
            ) : data && data.operatingSystems.length > 0 ? (
              <div className="space-y-4">
                {data.operatingSystems.map((o, i) => {
                  const total = data.operatingSystems.reduce((s, x) => s + x.count, 0)
                  const pct = total > 0 ? ((o.count / total) * 100).toFixed(1) : '0'
                  return (
                    <div key={o.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{o.name}</span>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{o.count.toLocaleString()} ({pct}%)</span>
                      </div>
                      <ProgressBar value={o.count} max={maxOsCount} color={OS_COLORS[i % OS_COLORS.length]} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">No OS data</p>
            )}
          </div>
        </div>
      </div>

      {/* Session Trend Chart */}
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Session Trend (Last 14 Days)</h3>
        {loading ? (
          <div className="h-[260px] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ) : data && data.sessionTrend.length > 0 ? (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.sessionTrend.map(d => ({
                  ...d,
                  label: (() => { try { return format(new Date(d.date), 'MMM d') } catch { return d.date } })(),
                }))}
                margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
                barCategoryGap="20%"
              >
                <XAxis dataKey="label" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                <Bar dataKey="count" name="Sessions" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-gray-400">No session trend data available</p>
        )}
      </div>

      {/* Recent Sessions Table */}
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Sessions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Country</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">City</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Browser</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-gray-200 dark:bg-gray-800" /></td>
                    ))}
                  </tr>
                ))
              ) : data && data.recentSessions.length > 0 ? (
                data.recentSessions.slice(0, 15).map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-gray-900 dark:text-gray-100 truncate max-w-[180px] block text-xs" title={s.user_email}>
                        {s.user_email}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{maskIp(s.ip_address)}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{s.location_info?.country || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{s.location_info?.city || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{s.device_info?.device_type || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{s.device_info?.browser || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        <span className={`text-[10px] font-medium ${s.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {(() => { try { return format(new Date(s.created_at), 'MMM d, yyyy HH:mm') } catch { return s.created_at } })()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Globe className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No session data found</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Session data will appear here once users start browsing.</p>
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
