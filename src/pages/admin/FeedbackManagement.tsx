import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, MessageSquare, Bug, Lightbulb, Sparkles, MoreHorizontal, Loader2 } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { AdminLayout } from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { getEdgeFunctionUrl, authHeaders } from '../../lib/api'

interface FeedbackItem {
  id: string
  user_id: string
  user_name: string
  type: 'bug' | 'feature' | 'improvement' | 'other'
  title: string
  description: string
  status: 'open' | 'in_review' | 'resolved' | 'closed'
  created_at: string
}

type StatusFilter = '' | 'open' | 'in_review' | 'resolved' | 'closed'

const TYPE_CONFIG: Record<FeedbackItem['type'], { label: string; color: string; icon: typeof Bug }> = {
  bug: { label: 'Bug', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: Bug },
  feature: { label: 'Feature', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Lightbulb },
  improvement: { label: 'Improvement', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Sparkles },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: MessageSquare },
}

const STATUS_CONFIG: Record<FeedbackItem['status'], { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  in_review: { label: 'In Review', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

const STATUS_OPTIONS: FeedbackItem['status'][] = ['open', 'in_review', 'resolved', 'closed']

const TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
]

function FeedbackManagement() {
  const { sessionToken } = useAuth()
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchFeedback = useCallback(async () => {
    if (!sessionToken) return
    setLoading(true)
    try {
      const url = `${getEdgeFunctionUrl('admin')}/feedback?page=${page}&limit=${limit}&status=${statusFilter}`
      const res = await fetch(url, { headers: authHeaders(sessionToken) })
      if (!res.ok) throw new Error('Failed to fetch feedback')
      const data = await res.json()
      if (data.ok) {
        setFeedback(data.feedback)
        setTotal(data.total)
      }
    } catch {
      toast.error('Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }, [sessionToken, page, limit, statusFilter])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  const updateStatus = async (id: string, newStatus: FeedbackItem['status']) => {
    if (!sessionToken) return
    setUpdatingId(id)
    setStatusMenuId(null)
    try {
      const res = await fetch(`${getEdgeFunctionUrl('admin')}/feedback/${id}`, {
        method: 'PATCH',
        headers: authHeaders(sessionToken),
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      setFeedback(prev => prev.map(f => (f.id === id ? { ...f, status: newStatus } : f)))
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  const statusCounts = feedback.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1
    return acc
  }, {})

  const totalPages = Math.ceil(total / limit)

  return (
    <AdminLayout title="Feedback" subtitle="Manage user feedback and bug reports">
      {/* Filter tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex flex-wrap gap-2">
          {TABS.map(tab => {
            const isActive = statusFilter === tab.value
            const count = tab.value === '' ? total : (statusCounts[tab.value] ?? 0)
            return (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setPage(1) }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                    : 'bg-white dark:bg-black text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {total} total {total === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading feedback…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && feedback.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No feedback found</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {statusFilter ? 'Try selecting a different filter' : 'No feedback has been submitted yet'}
          </p>
        </div>
      )}

      {/* Feedback cards */}
      {!loading && feedback.length > 0 && (
        <div className="space-y-3">
          {feedback.map(item => {
            const typeConf = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.other
            const statusConf = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.open
            const TypeIcon = typeConf.icon
            const isExpanded = expandedId === item.id
            const isUpdating = updatingId === item.id
            const isMenuOpen = statusMenuId === item.id

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden transition-shadow hover:shadow-sm"
              >
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Type badge */}
                      <div className={`flex-shrink-0 mt-0.5 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${typeConf.color}`}>
                        <TypeIcon className="h-3 w-3" />
                        {typeConf.label}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {item.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{item.user_name}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500" title={format(new Date(item.created_at), 'PPpp')}>
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Status badge */}
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConf.color}`}>
                        {statusConf.label}
                      </span>

                      {/* Status change dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setStatusMenuId(isMenuOpen ? null : item.id)}
                          disabled={isUpdating}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors disabled:opacity-50"
                        >
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </button>
                        {isMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setStatusMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-50 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
                              <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                Set Status
                              </p>
                              {STATUS_OPTIONS.map(s => (
                                <button
                                  key={s}
                                  onClick={() => updateStatus(item.id, s)}
                                  disabled={item.status === s}
                                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                    item.status === s
                                      ? 'text-gray-300 dark:text-gray-600 cursor-default'
                                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                  }`}
                                >
                                  <span className={`h-2 w-2 rounded-full ${
                                    s === 'open' ? 'bg-yellow-400' :
                                    s === 'in_review' ? 'bg-blue-400' :
                                    s === 'resolved' ? 'bg-green-400' : 'bg-gray-400'
                                  }`} />
                                  {STATUS_CONFIG[s].label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable description */}
                  {item.description && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="mt-3 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          Show details
                        </>
                      )}
                    </button>
                  )}
                </div>

                {isExpanded && item.description && (
                  <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default FeedbackManagement
