import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gift, Plus, Search, Trash2, Edit2, IndianRupee, Calendar, Tag, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { getEdgeFunctionUrl, apiFetch } from '../../../lib/api'
import ConfirmModal from '../../../components/ui/ConfirmModal'

interface DowryEntry {
  id: string
  item_description: string
  value: number | null
  gift_date: string | null
  transfer_type: string | null
  evidence_urls: string[]
  demand_recordings_url: string[]
  witnesses: any[]
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  jewelry: 'Jewelry',
  appliances: 'Appliances',
  vehicle: 'Vehicle',
  property: 'Property',
  other: 'Other',
}

const TYPE_COLORS: Record<string, string> = {
  cash: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  bank_transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  jewelry: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  appliances: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  vehicle: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  property: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

export default function GiftTracker() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<DowryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date')

  useEffect(() => {
    const controller = new AbortController()
    loadEntries(controller.signal)
    return () => { controller.abort() }
  }, [])

  const loadEntries = async (signal?: AbortSignal) => {
    try {
      if (!sessionToken) return
      const res = await apiFetch(`${getEdgeFunctionUrl('dowry')}/entries`, sessionToken, {
        signal,
      })
      if (!res.ok) throw new Error('Failed to load entries')
      const data = await res.json()
      setEntries(data.entries || [])
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Failed to load entries')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (entryId: string) => {
    setDeleteConfirmId(null)
    const prev = [...entries]
    setEntries((e) => e.filter((x) => x.id !== entryId))

    try {
      if (!sessionToken) throw new Error('Not authenticated')
      const res = await apiFetch(`${getEdgeFunctionUrl('dowry')}/entry/${entryId}`, sessionToken, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Entry deleted')
    } catch (err: any) {
      setEntries(prev)
      toast.error(err.message || 'Failed to delete')
    }
  }

  const formatCurrency = (v: number) =>
    `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  const filtered = entries
    .filter((e) => {
      if (search && !e.item_description.toLowerCase().includes(search.toLowerCase())) return false
      if (typeFilter && e.transfer_type !== typeFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'value') return (b.value ?? 0) - (a.value ?? 0)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const totalValue = filtered.reduce((s, e) => s + (e.value ?? 0), 0)

  return (
    <DashboardLayout title="Gift Tracker" subtitle={`${entries.length} documented item${entries.length !== 1 ? 's' : ''}`} backHref="/dashboard/dowry-vault">
      <div className="w-full max-w-5xl mx-auto space-y-4">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm dark:bg-black dark:border-red-700/40 dark:text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white/60 py-2 pl-9 pr-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                placeholder="Search items..."
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white/60 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">All Types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'value')}
              className="hidden sm:block rounded-lg border border-gray-200 bg-white/60 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
            >
              <option value="date">Newest First</option>
              <option value="value">Highest Value</option>
            </select>
          </div>
          <button
            onClick={() => navigate('/dashboard/dowry-vault/add')}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Entry
          </button>
        </div>

        {/* Summary Bar */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-purple-200/50 bg-purple-50/30 px-4 py-2.5 text-sm dark:bg-black dark:border-purple-700/40">
            <span className="text-gray-600 dark:text-gray-400">
              Showing <strong>{filtered.length}</strong> of {entries.length} entries
            </span>
            <span className="font-semibold text-purple-700 dark:text-purple-300">{formatCurrency(totalValue)}</span>
          </div>
        )}

        {/* Entries List */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 sm:p-12 text-center dark:bg-black dark:border-gray-700">
            <Gift className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              {entries.length === 0 ? 'No entries yet' : 'No matching entries'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {entries.length === 0 ? 'Start by adding your first dowry entry.' : 'Try adjusting your filters.'}
            </p>
            {entries.length === 0 && (
              <button
                onClick={() => navigate('/dashboard/dowry-vault/add')}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add First Entry
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                className="group rounded-lg border border-gray-200/60 bg-white/60 hover:bg-white/90 hover:shadow-sm transition-all dark:bg-black dark:border-gray-700 dark:hover:bg-gray-900"
              >
                <div className="flex items-start gap-3 p-4 sm:p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-900 truncate dark:text-white">{entry.item_description}</h4>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                          {entry.value != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              <IndianRupee className="h-3 w-3" />
                              {entry.value.toLocaleString('en-IN')}
                            </span>
                          )}
                          {entry.transfer_type && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${TYPE_COLORS[entry.transfer_type] || TYPE_COLORS.other}`}>
                              <Tag className="h-3 w-3" />
                              {TYPE_LABELS[entry.transfer_type] || entry.transfer_type}
                            </span>
                          )}
                          {entry.gift_date && (
                            <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              <Calendar className="h-3 w-3" />
                              {new Date(entry.gift_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigate(`/dashboard/dowry-vault/edit/${entry.id}`)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors touch-manipulation dark:hover:bg-gray-800 dark:hover:text-gray-300"
                          aria-label="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(entry.id)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors touch-manipulation dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Delete this entry?"
        message="This dowry entry will be permanently removed. This action cannot be undone."
      />
    </DashboardLayout>
  )
}
