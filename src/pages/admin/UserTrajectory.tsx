import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Shield, AlertTriangle, TrendingUp, MessageSquare, Gift,
  ShieldAlert, Calculator, UserPlus, Bug, Cpu, Loader2,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { AdminLayout } from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { getEdgeFunctionUrl, authHeaders } from '../../lib/api'

interface TimelineEvent {
  type: string
  module: string
  detail: string
  date: string
}

interface UserInfo {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  role: string
  created_at: string
}

interface TrajectoryData {
  user: UserInfo
  timeline: TimelineEvent[]
  moduleCounts: Record<string, number>
  totalEvents: number
}

const MODULE_ICONS: Record<string, typeof Shield> = {
  'Account': UserPlus,
  'Consent Vault': Shield,
  'Red Flag Radar': AlertTriangle,
  'Income Tracker': TrendingUp,
  'DV Log': ShieldAlert,
  'Dowry Vault': Gift,
  'Breakup Generator': MessageSquare,
  'Maintenance Calc': Calculator,
  'Feedback': Bug,
  'AI': Cpu,
}

const MODULE_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  'Account':           { dot: 'bg-gray-500',   bg: 'bg-gray-50 dark:bg-gray-900',     text: 'text-gray-700 dark:text-gray-300',   border: 'border-gray-200 dark:border-gray-700' },
  'Consent Vault':     { dot: 'bg-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-700 dark:text-blue-400',   border: 'border-blue-200 dark:border-blue-800' },
  'Red Flag Radar':    { dot: 'bg-red-500',    bg: 'bg-red-50 dark:bg-red-900/20',     text: 'text-red-700 dark:text-red-400',     border: 'border-red-200 dark:border-red-800' },
  'Income Tracker':    { dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  'DV Log':            { dot: 'bg-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  'Dowry Vault':       { dot: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  'Breakup Generator': { dot: 'bg-pink-500',   bg: 'bg-pink-50 dark:bg-pink-900/20',   text: 'text-pink-700 dark:text-pink-400',   border: 'border-pink-200 dark:border-pink-800' },
  'Maintenance Calc':  { dot: 'bg-cyan-500',   bg: 'bg-cyan-50 dark:bg-cyan-900/20',   text: 'text-cyan-700 dark:text-cyan-400',   border: 'border-cyan-200 dark:border-cyan-800' },
  'Feedback':          { dot: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  'AI':                { dot: 'bg-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
}

const DEFAULT_COLORS = { dot: 'bg-gray-400', bg: 'bg-gray-50 dark:bg-gray-900', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' }

export default function UserTrajectory() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { sessionToken } = useAuth()
  const [data, setData] = useState<TrajectoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [showAI, setShowAI] = useState(false)
  const fetchingRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      if (fetchingRef.current || !sessionToken || !id) return
      fetchingRef.current = true
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`${getEdgeFunctionUrl('admin')}/users/${id}/trajectory`, {
          headers: authHeaders(sessionToken),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch user trajectory')
        const json = await res.json()
        if (json.ok) setData(json)
        else throw new Error(json.error || 'Unexpected response')
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
  }, [sessionToken, id])

  const filteredTimeline = data?.timeline.filter(e => {
    if (filter !== 'all' && e.module !== filter) return false
    if (!showAI && e.module === 'AI') return false
    return true
  }) || []

  const userName = data?.user
    ? [data.user.first_name, data.user.last_name].filter(Boolean).join(' ') || data.user.email
    : 'User'

  // Group events by date
  const groupedByDate: Record<string, TimelineEvent[]> = {}
  filteredTimeline.forEach(e => {
    const day = e.date?.substring(0, 10) || 'Unknown'
    if (!groupedByDate[day]) groupedByDate[day] = []
    groupedByDate[day].push(e)
  })

  const modules = data ? Object.keys(data.moduleCounts).filter(m => m !== 'AI') : []

  return (
    <AdminLayout
      title={loading ? 'Loading...' : `${userName}'s Trajectory`}
      subtitle={data ? `${data.totalEvents} events tracked` : undefined}
    >
      {/* Back button */}
      <button
        onClick={() => navigate('/admin/users')}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </button>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
          <p className="text-sm text-gray-400">Loading user trajectory...</p>
        </div>
      ) : data ? (
        <>
          {/* User Profile Card */}
          <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white text-lg font-bold">
                {(data.user.first_name || data.user.email)[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{userName}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{data.user.email}</p>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  data.user.role === 'super_admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : data.user.role === 'admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>{data.user.role}</span>
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 capitalize">{data.user.gender || 'unset'}</span>
              </div>
            </div>

            {/* Module usage summary */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Modules Used</p>
              <div className="flex flex-wrap gap-2">
                {modules.map(mod => {
                  const colors = MODULE_COLORS[mod] || DEFAULT_COLORS
                  return (
                    <span key={mod} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                      {mod} <span className="font-bold">{data.moduleCounts[mod]}</span>
                    </span>
                  )
                })}
                {modules.length === 0 && <span className="text-xs text-gray-400">No feature usage yet</span>}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === 'all' ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All ({filteredTimeline.length})
            </button>
            {modules.map(mod => {
              const colors = MODULE_COLORS[mod] || DEFAULT_COLORS
              return (
                <button
                  key={mod}
                  onClick={() => setFilter(filter === mod ? 'all' : mod)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === mod ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : `${colors.bg} ${colors.text} hover:opacity-80`
                  }`}
                >
                  {mod} ({data.moduleCounts[mod]})
                </button>
              )
            })}
            <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
              <input type="checkbox" checked={showAI} onChange={e => setShowAI(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600 text-blue-600" />
              Show AI calls
            </label>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />

            {Object.entries(groupedByDate).map(([date, events]) => (
              <div key={date} className="mb-6">
                {/* Date header */}
                <div className="relative mb-3 flex items-center gap-3 pl-10">
                  <div className="absolute left-[13px] h-3 w-3 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-black z-10" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {(() => { try { return format(new Date(date), 'EEEE, MMMM d, yyyy') } catch { return date } })()}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {(() => { try { return formatDistanceToNow(new Date(date), { addSuffix: true }) } catch { return '' } })()}
                  </span>
                </div>

                {/* Events for this day */}
                <div className="space-y-2">
                  {events.map((event, i) => {
                    const colors = MODULE_COLORS[event.module] || DEFAULT_COLORS
                    const Icon = MODULE_ICONS[event.module] || Shield
                    return (
                      <div key={`${date}-${i}`} className="relative flex items-start gap-3 pl-10">
                        {/* Dot */}
                        <div className={`absolute left-[15px] top-2.5 h-2 w-2 rounded-full ${colors.dot} z-10 ring-2 ring-white dark:ring-black`} />

                        {/* Card */}
                        <div className={`flex-1 rounded-lg border px-4 py-2.5 ${colors.border} ${colors.bg} transition-colors`}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${colors.text}`} />
                            <span className={`text-[10px] font-semibold uppercase tracking-wide ${colors.text}`}>{event.module}</span>
                            <span className="ml-auto text-[10px] text-gray-400 tabular-nums whitespace-nowrap">
                              {(() => { try { return format(new Date(event.date), 'h:mm a') } catch { return '' } })()}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{event.detail}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {filteredTimeline.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-400">No events to show{filter !== 'all' ? ' for this filter' : ''}.</p>
              </div>
            )}
          </div>
        </>
      ) : null}
    </AdminLayout>
  )
}
