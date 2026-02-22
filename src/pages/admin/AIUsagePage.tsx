import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Activity, ChevronLeft, ChevronRight, Clock, Coins, Hash, Zap } from 'lucide-react'
import { AdminLayout } from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { getEdgeFunctionUrl, apiFetch } from '../../lib/api'

interface UsageLog {
  id: string
  user_id: string
  user_email: string
  service_type: string
  provider: string
  model: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  total_cost: string
  response_time_ms: number
  created_at: string
}

interface UsageResponse {
  ok: boolean
  logs: UsageLog[]
  total: number
  page: number
  limit: number
}

const SERVICE_BADGES: Record<string, string> = {
  chat_analysis: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  risk_check: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function serviceBadgeClass(type: string) {
  return SERVICE_BADGES[type] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

function formatResponseTime(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

function formatNumber(n: number) {
  return n.toLocaleString('en-US')
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-200 dark:bg-gray-800" />
        </td>
      ))}
    </tr>
  )
}

export default function AIUsagePage() {
  const { sessionToken } = useAuth()
  const [logs, setLogs] = useState<UsageLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const limit = 50

  const fetchLogs = useCallback(async (p: number) => {
    if (!sessionToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(
        `${getEdgeFunctionUrl('admin')}/ai-usage?page=${p}&limit=${limit}`,
        sessionToken,
      )
      if (!res.ok) throw new Error(`Server responded with ${res.status}`)
      const data: UsageResponse = await res.json()
      if (!data.ok) throw new Error('Unexpected response')
      setLogs(data.logs)
      setTotal(data.total)
      setPage(data.page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI usage data')
    } finally {
      setLoading(false)
    }
  }, [sessionToken])

  useEffect(() => {
    fetchLogs(page)
  }, [fetchLogs, page])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const totalRequests = logs.length
  const totalTokens = logs.reduce((s, l) => s + l.total_tokens, 0)
  const totalCost = logs.reduce((s, l) => s + parseFloat(l.total_cost), 0)
  const avgResponseTime = logs.length
    ? Math.round(logs.reduce((s, l) => s + l.response_time_ms, 0) / logs.length)
    : 0

  const cards = [
    { label: 'Total Requests', value: formatNumber(totalRequests), icon: Hash, accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Tokens', value: formatNumber(totalTokens), icon: Zap, accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Total Cost', value: `$${totalCost.toFixed(2)}`, icon: Coins, accent: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Avg Response Time', value: formatResponseTime(avgResponseTime), icon: Clock, accent: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ]

  return (
    <AdminLayout title="AI Usage" subtitle="Monitor AI service consumption and costs">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {card.label}
                </span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.accent}`} />
                </div>
              </div>
              <div className={`text-2xl font-bold font-mono ${card.accent}`}>
                {loading ? (
                  <div className="h-8 w-24 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
                ) : (
                  card.value
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => fetchLogs(page)}
            className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Model</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tokens</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Response</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Activity className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No AI usage logs found</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Usage data will appear here once AI services are used.</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-gray-900 dark:text-gray-100 truncate max-w-[180px] block" title={log.user_email}>
                        {log.user_email}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${serviceBadgeClass(log.service_type)}`}>
                        {log.service_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{log.provider}</td>
                    <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300 text-xs">{log.model}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-gray-900 dark:text-gray-100">{formatNumber(log.total_tokens)}</span>
                      <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                        {formatNumber(log.input_tokens)} / {formatNumber(log.output_tokens)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">
                      ${parseFloat(log.total_cost).toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600 dark:text-gray-400">
                      {formatResponseTime(log.response_time_ms)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > limit && (
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-4 py-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium text-gray-700 dark:text-gray-300">{(page - 1) * limit + 1}</span>
              –<span className="font-medium text-gray-700 dark:text-gray-300">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">{formatNumber(total)}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
