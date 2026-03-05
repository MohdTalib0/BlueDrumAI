import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Filter, Search } from 'lucide-react'
import { format } from 'date-fns'
import { AdminLayout } from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { getEdgeFunctionUrl, apiFetch } from '../../lib/api'

interface AuditEntry {
  id: string
  user_id: string
  user_name: string
  action: string
  resource_type: string
  resource_id: string | null
  changes: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  request_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

interface AuditResponse {
  ok: boolean
  logs: AuditEntry[]
  total: number
  page: number
  limit: number
  filters: { actions: string[]; resources: string[] }
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  view: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  export: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

function actionColor(action: string) {
  return ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

export default function AuditLogPage() {
  const { sessionToken } = useAuth()
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')
  const [actions, setActions] = useState<string[]>([])
  const [resources, setResources] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const limit = 50

  const fetchLogs = useCallback(async (p: number) => {
    if (!sessionToken) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) })
      if (actionFilter) params.set('action', actionFilter)
      if (resourceFilter) params.set('resource', resourceFilter)

      const res = await apiFetch(`${getEdgeFunctionUrl('admin')}/audit-logs?${params}`, sessionToken)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: AuditResponse = await res.json()
      if (!data.ok) throw new Error('Unexpected response')
      setLogs(data.logs)
      setTotal(data.total)
      setPage(data.page)
      if (data.filters) {
        setActions(data.filters.actions)
        setResources(data.filters.resources)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [sessionToken, actionFilter, resourceFilter])

  useEffect(() => { fetchLogs(1) }, [fetchLogs])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <AdminLayout title="Audit Logs" subtitle="Full history of data changes and user actions">
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          <Filter className="h-3.5 w-3.5" /> Filters:
        </div>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={resourceFilter}
          onChange={e => { setResourceFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="">All Resources</option>
          {resources.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(actionFilter || resourceFilter) && (
          <button
            onClick={() => { setActionFilter(''); setResourceFilter(''); setPage(1) }}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-[10px] text-gray-400">{total.toLocaleString()} entries</span>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
          <button onClick={() => fetchLogs(page)} className="ml-2 font-medium hover:underline">Retry</button>
        </div>
      )}

      {/* Logs Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Time</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">User</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Action</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Resource</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">IP</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-gray-200 dark:bg-gray-800" /></td>)}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <FileText className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No audit logs found</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {(() => { try { return format(new Date(log.created_at), 'MMM d, HH:mm:ss') } catch { return '—' } })()}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-900 dark:text-gray-100 truncate max-w-[150px]">{log.user_name}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${actionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 dark:text-gray-300">{log.resource_type}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">{log.ip_address || '—'}</td>
                      <td className="px-5 py-3">
                        <Search className="h-3.5 w-3.5 text-gray-400" />
                      </td>
                    </tr>
                    {expanded === log.id && (
                      <tr key={`${log.id}-detail`}>
                        <td colSpan={6} className="px-5 py-4 bg-gray-50 dark:bg-gray-900/40">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            {log.resource_id && (
                              <div>
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Resource ID:</span>{' '}
                                <span className="font-mono text-gray-700 dark:text-gray-300">{log.resource_id}</span>
                              </div>
                            )}
                            {log.request_id && (
                              <div>
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Request ID:</span>{' '}
                                <span className="font-mono text-gray-700 dark:text-gray-300">{log.request_id}</span>
                              </div>
                            )}
                            {log.user_agent && (
                              <div className="md:col-span-2">
                                <span className="font-semibold text-gray-500 dark:text-gray-400">User Agent:</span>{' '}
                                <span className="text-gray-600 dark:text-gray-400 break-all">{log.user_agent}</span>
                              </div>
                            )}
                            {log.changes && Object.keys(log.changes).length > 0 && (
                              <div className="md:col-span-2">
                                <span className="font-semibold text-gray-500 dark:text-gray-400 block mb-1">Changes:</span>
                                <pre className="rounded-lg bg-gray-100 dark:bg-gray-800 p-3 text-[11px] font-mono text-gray-700 dark:text-gray-300 overflow-auto max-h-40">
                                  {JSON.stringify(log.changes, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="md:col-span-2">
                                <span className="font-semibold text-gray-500 dark:text-gray-400 block mb-1">Metadata:</span>
                                <pre className="rounded-lg bg-gray-100 dark:bg-gray-800 p-3 text-[11px] font-mono text-gray-700 dark:text-gray-300 overflow-auto max-h-40">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > limit && (
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-4 py-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">{(page - 1) * limit + 1}</span>–
              <span className="font-medium text-gray-700 dark:text-gray-300">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">{total.toLocaleString()}</span>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => { setPage(p => Math.max(1, p - 1)); fetchLogs(Math.max(1, page - 1)) }} disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 disabled:opacity-30 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-medium text-gray-600 dark:text-gray-400">{page} / {totalPages}</span>
              <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); fetchLogs(Math.min(totalPages, page + 1)) }} disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 disabled:opacity-30 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
