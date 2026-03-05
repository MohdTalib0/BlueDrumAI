import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Bell, BellOff, ChevronDown, ChevronUp, Clock, Plus, Shield, Trash2, Users, X } from 'lucide-react'
import { format } from 'date-fns'
import { AdminLayout } from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { getEdgeFunctionUrl, apiFetch } from '../../lib/api'

// ──────────────── Types ────────────────

interface Incident {
  id: string
  title: string
  description: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'mitigating' | 'resolved' | 'closed'
  affected_service: string | null
  affected_user_count: number
  root_cause: string | null
  resolution: string | null
  created_by_name: string
  resolved_at: string | null
  created_at: string
  updated_at: string
}

interface Alert {
  id: string
  name: string
  description: string | null
  metric: string
  condition: string
  threshold: number
  time_window_minutes: number
  is_active: boolean
  last_triggered_at: string | null
  trigger_count: number
  created_at: string
}

interface AlertHistoryItem {
  id: string
  alert_id: string
  metric_value: number
  threshold: number
  message: string | null
  acknowledged: boolean
  created_at: string
}

// ──────────────── Constants ────────────────

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  investigating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  mitigating: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}
const SERVICES = ['auth', 'vault', 'red_flag', 'income', 'ai', 'storage', 'all']
const METRICS = ['error_rate', 'ai_cost', 'response_time', 'signup_rate', 'active_users']
const CONDITIONS: Record<string, string> = { gt: '>', lt: '<', eq: '=', gte: '≥', lte: '≤' }

// ──────────────── Component ────────────────

export default function IncidentsPage() {
  const { sessionToken } = useAuth()

  // Incidents state
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loadingIncidents, setLoadingIncidents] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showNewIncident, setShowNewIncident] = useState(false)
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null)

  // Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertHistory, setAlertHistory] = useState<AlertHistoryItem[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [showNewAlert, setShowNewAlert] = useState(false)

  const [tab, setTab] = useState<'incidents' | 'alerts'>('incidents')
  const [error, setError] = useState('')

  // ── Fetch ──

  const fetchIncidents = useCallback(async () => {
    if (!sessionToken) return
    setLoadingIncidents(true)
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : ''
      const res = await apiFetch(`${getEdgeFunctionUrl('admin')}/incidents${qs}`, sessionToken)
      const json = await res.json()
      if (json.ok) setIncidents(json.incidents)
    } catch { setError('Failed to load incidents') }
    finally { setLoadingIncidents(false) }
  }, [sessionToken, statusFilter])

  const fetchAlerts = useCallback(async () => {
    if (!sessionToken) return
    setLoadingAlerts(true)
    try {
      const res = await apiFetch(`${getEdgeFunctionUrl('admin')}/alerts`, sessionToken)
      const json = await res.json()
      if (json.ok) { setAlerts(json.alerts); setAlertHistory(json.history) }
    } catch { setError('Failed to load alerts') }
    finally { setLoadingAlerts(false) }
  }, [sessionToken])

  useEffect(() => { fetchIncidents() }, [fetchIncidents])
  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  // ── Incident CRUD ──

  async function createIncident(form: Record<string, unknown>) {
    if (!sessionToken) return
    const res = await apiFetch(`${getEdgeFunctionUrl('admin')}/incidents`, sessionToken, {
      method: 'POST',
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (json.ok) { setShowNewIncident(false); fetchIncidents() }
    else setError(json.error || 'Failed to create incident')
  }

  async function updateIncident(id: string, fields: Record<string, unknown>) {
    if (!sessionToken) return
    await apiFetch(`${getEdgeFunctionUrl('admin')}/incidents/${id}`, sessionToken, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    })
    fetchIncidents()
  }

  // ── Alert CRUD ──

  async function createAlert(form: Record<string, unknown>) {
    if (!sessionToken) return
    const res = await apiFetch(`${getEdgeFunctionUrl('admin')}/alerts`, sessionToken, {
      method: 'POST',
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (json.ok) { setShowNewAlert(false); fetchAlerts() }
    else setError(json.error || 'Failed to create alert')
  }

  async function toggleAlert(id: string, active: boolean) {
    if (!sessionToken) return
    await apiFetch(`${getEdgeFunctionUrl('admin')}/alerts/${id}`, sessionToken, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: active }),
    })
    fetchAlerts()
  }

  async function deleteAlert(id: string) {
    if (!sessionToken) return
    await apiFetch(`${getEdgeFunctionUrl('admin')}/alerts/${id}`, sessionToken, { method: 'DELETE' })
    fetchAlerts()
  }

  // ── Counts ──
  const openIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' && !['resolved', 'closed'].includes(i.status)).length
  const activeAlerts = alerts.filter(a => a.is_active).length

  return (
    <AdminLayout title="Incidents & Alerts" subtitle="Track issues, affected users, and alert rules">
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Open Incidents</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{openIncidents}</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Critical</p>
          <p className={`mt-2 text-2xl font-bold ${criticalIncidents > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{criticalIncidents}</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Active Alerts</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{activeAlerts}</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Incidents</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{incidents.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-1 w-fit">
        <button onClick={() => setTab('incidents')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'incidents' ? 'bg-red-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900'}`}>
          <Shield className="inline h-4 w-4 mr-1.5 -mt-0.5" />Incidents
        </button>
        <button onClick={() => setTab('alerts')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'alerts' ? 'bg-red-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900'}`}>
          <Bell className="inline h-4 w-4 mr-1.5 -mt-0.5" />Alerts
        </button>
      </div>

      {/* ══════════ INCIDENTS TAB ══════════ */}
      {tab === 'incidents' && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">All Statuses</option>
              {['open', 'investigating', 'mitigating', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => setShowNewIncident(true)}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> New Incident
            </button>
          </div>

          {/* New Incident Form */}
          {showNewIncident && <NewIncidentForm onSubmit={createIncident} onCancel={() => setShowNewIncident(false)} />}

          {/* Incidents List */}
          <div className="space-y-3">
            {loadingIncidents ? (
              [0,1,2].map(i => <div key={i} className="h-20 animate-pulse rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black" />)
            ) : incidents.length === 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-10 text-center">
                <Shield className="mx-auto h-10 w-10 text-green-300 dark:text-green-800 mb-3" />
                <p className="text-sm font-medium text-green-600 dark:text-green-400">No incidents recorded</p>
              </div>
            ) : (
              incidents.map(inc => (
                <div key={inc.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black overflow-hidden">
                  <div
                    className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                    onClick={() => setExpandedIncident(expandedIncident === inc.id ? null : inc.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${SEVERITY_COLORS[inc.severity]}`}>{inc.severity}</span>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[inc.status]}`}>{inc.status}</span>
                        {inc.affected_service && (
                          <span className="inline-block rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">{inc.affected_service}</span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{inc.title}</h4>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {inc.affected_user_count > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Users className="h-3.5 w-3.5" /> {inc.affected_user_count}
                        </div>
                      )}
                      <span className="text-xs text-gray-400">{(() => { try { return format(new Date(inc.created_at), 'MMM d, HH:mm') } catch { return '—' } })()}</span>
                      {expandedIncident === inc.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>

                  {expandedIncident === inc.id && (
                    <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-4">
                      {inc.description && <p className="text-sm text-gray-600 dark:text-gray-400">{inc.description}</p>}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div><span className="font-semibold text-gray-500 dark:text-gray-400">Created by:</span> <span className="text-gray-700 dark:text-gray-300">{inc.created_by_name}</span></div>
                        <div><span className="font-semibold text-gray-500 dark:text-gray-400">Affected users:</span> <span className="text-gray-700 dark:text-gray-300">{inc.affected_user_count}</span></div>
                        {inc.resolved_at && <div><span className="font-semibold text-gray-500 dark:text-gray-400">Resolved:</span> <span className="text-gray-700 dark:text-gray-300">{format(new Date(inc.resolved_at), 'MMM d, HH:mm')}</span></div>}
                        {inc.root_cause && <div className="col-span-2"><span className="font-semibold text-gray-500 dark:text-gray-400">Root cause:</span> <span className="text-gray-700 dark:text-gray-300">{inc.root_cause}</span></div>}
                        {inc.resolution && <div className="col-span-2"><span className="font-semibold text-gray-500 dark:text-gray-400">Resolution:</span> <span className="text-gray-700 dark:text-gray-300">{inc.resolution}</span></div>}
                      </div>

                      {/* Quick status update */}
                      <div className="flex flex-wrap gap-2">
                        {['investigating', 'mitigating', 'resolved', 'closed'].filter(s => s !== inc.status).map(s => (
                          <button key={s} onClick={() => updateIncident(inc.id, { status: s })}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border ${
                              s === 'resolved' ? 'border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                                : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                            }`}>
                            Mark {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ══════════ ALERTS TAB ══════════ */}
      {tab === 'alerts' && (
        <>
          <div className="mb-4 flex items-center">
            <button onClick={() => setShowNewAlert(true)}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> New Alert Rule
            </button>
          </div>

          {showNewAlert && <NewAlertForm onSubmit={createAlert} onCancel={() => setShowNewAlert(false)} />}

          {/* Alert Rules */}
          <div className="mb-6 space-y-3">
            {loadingAlerts ? (
              [0,1,2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black" />)
            ) : alerts.length === 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-10 text-center">
                <Bell className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No alert rules configured</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`rounded-xl border bg-white dark:bg-black p-4 flex items-center gap-4 ${alert.is_active ? 'border-gray-200 dark:border-gray-800' : 'border-gray-100 dark:border-gray-900 opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{alert.name}</h4>
                      {alert.is_active
                        ? <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">active</span>
                        : <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:text-gray-400">paused</span>
                      }
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {alert.metric.replace(/_/g, ' ')} {CONDITIONS[alert.condition] || alert.condition} {alert.threshold} (window: {alert.time_window_minutes}m)
                      {alert.trigger_count > 0 && <> · triggered {alert.trigger_count}x</>}
                      {alert.last_triggered_at && <> · last: {format(new Date(alert.last_triggered_at), 'MMM d HH:mm')}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => toggleAlert(alert.id, !alert.is_active)} title={alert.is_active ? 'Pause' : 'Activate'}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                      {alert.is_active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </button>
                    <button onClick={() => deleteAlert(alert.id)} title="Delete"
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Alert History */}
          {alertHistory.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Alert History</h3>
              <div className="space-y-2">
                {alertHistory.slice(0, 20).map(h => {
                  const alert = alerts.find(a => a.id === h.alert_id)
                  return (
                    <div key={h.id} className="flex items-center gap-3 text-xs">
                      <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{(() => { try { return format(new Date(h.created_at), 'MMM d HH:mm') } catch { return '—' } })()}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{alert?.name || 'Deleted alert'}</span>
                      <span className="text-gray-500 dark:text-gray-400">value: {h.metric_value} (threshold: {h.threshold})</span>
                      {h.message && <span className="text-gray-400 truncate max-w-[200px]">{h.message}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  )
}

// ──────────────── Inline Forms ────────────────

function NewIncidentForm({ onSubmit, onCancel }: { onSubmit: (f: Record<string, unknown>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [service, setService] = useState('')
  const [userCount, setUserCount] = useState(0)

  return (
    <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-white dark:bg-black p-5">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Report New Incident</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Incident title *"
          className="col-span-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2}
          className="col-span-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none" />
        <select value={severity} onChange={e => setSeverity(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none">
          {['low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={service} onChange={e => setService(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none">
          <option value="">Select service</option>
          {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Affected users</label>
          <input type="number" value={userCount} onChange={e => setUserCount(parseInt(e.target.value) || 0)} min={0}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/30" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">Cancel</button>
        <button onClick={() => { if (title.trim()) onSubmit({ title, description, severity, affected_service: service || null, affected_user_count: userCount }) }}
          disabled={!title.trim()}
          className="px-4 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
          Create Incident
        </button>
      </div>
    </div>
  )
}

function NewAlertForm({ onSubmit, onCancel }: { onSubmit: (f: Record<string, unknown>) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [metric, setMetric] = useState('error_rate')
  const [condition, setCondition] = useState('gt')
  const [threshold, setThreshold] = useState(5)
  const [window, setWindow] = useState(60)

  return (
    <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800/40 bg-white dark:bg-black p-5">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">New Alert Rule</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Alert name *"
          className="col-span-3 md:col-span-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        <select value={metric} onChange={e => setMetric(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none">
          {METRICS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={condition} onChange={e => setCondition(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none">
          {Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
        </select>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Threshold</label>
          <input type="number" value={threshold} onChange={e => setThreshold(parseFloat(e.target.value) || 0)} step="any"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Time window (min)</label>
          <input type="number" value={window} onChange={e => setWindow(parseInt(e.target.value) || 60)} min={1}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">Cancel</button>
        <button onClick={() => { if (name.trim()) onSubmit({ name, metric, condition, threshold, time_window_minutes: window }) }}
          disabled={!name.trim()}
          className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
          Create Alert
        </button>
      </div>
    </div>
  )
}
