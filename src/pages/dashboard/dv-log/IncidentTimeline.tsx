import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, Plus, Search, Trash2, Edit2, MapPin, Calendar, Loader2, AlertCircle, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { getEdgeFunctionUrl, apiFetch } from '../../../lib/api'
import ConfirmModal from '../../../components/ui/ConfirmModal'

interface Incident {
  id: string
  incident_date: string
  incident_type: string
  description: string
  location: string | null
  evidence_urls: string[]
  medical_report_url: string | null
  police_complaint_url: string | null
  witnesses: any[]
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  physical: 'Physical',
  emotional: 'Emotional',
  financial: 'Financial',
  sexual: 'Sexual',
  threat: 'Threats',
  other: 'Other',
}

const TYPE_COLORS: Record<string, string> = {
  physical: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  emotional: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  financial: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  sexual: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700',
  threat: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  other: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
}

const TIMELINE_COLORS: Record<string, string> = {
  physical: 'bg-red-500',
  emotional: 'bg-orange-500',
  financial: 'bg-yellow-500',
  sexual: 'bg-rose-500',
  threat: 'bg-purple-500',
  other: 'bg-gray-400',
}

export default function IncidentTimeline() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [generatingComplaint, setGeneratingComplaint] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    loadIncidents(controller.signal)
    return () => { controller.abort() }
  }, [])

  const loadIncidents = async (signal?: AbortSignal) => {
    try {
      if (!sessionToken) return
      const res = await apiFetch(`${getEdgeFunctionUrl('dv')}/incidents`, sessionToken, {
        signal,
      })
      if (!res.ok) throw new Error('Failed to load incidents')
      const data = await res.json()
      setIncidents(data.incidents || [])
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Failed to load incidents')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (incidentId: string) => {
    setDeleteConfirmId(null)
    const prev = [...incidents]
    setIncidents((i) => i.filter((x) => x.id !== incidentId))

    try {
      if (!sessionToken) throw new Error('Not authenticated')
      const res = await apiFetch(`${getEdgeFunctionUrl('dv')}/incident/${incidentId}`, sessionToken, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Incident deleted')
    } catch (err: any) {
      setIncidents(prev)
      toast.error(err.message || 'Failed to delete')
    }
  }

  const handleGenerateComplaint = async (incidentId: string) => {
    try {
      setGeneratingComplaint(incidentId)
      if (!sessionToken) throw new Error('Not authenticated')

      const res = await apiFetch(`${getEdgeFunctionUrl('dv')}/generate-complaint`, sessionToken, {
        method: 'POST',
        body: JSON.stringify({ incident_id: incidentId }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(errData.error || 'Failed to generate')
      }

      const data = await res.json()
      try {
        await navigator.clipboard.writeText(data.complaint)
        toast.success('Police complaint template copied to clipboard!')
      } catch {
        const blob = new Blob([data.complaint], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'police-complaint.txt'
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Complaint downloaded as file (clipboard unavailable)')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate complaint')
    } finally {
      setGeneratingComplaint(null)
    }
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatTime = (d: string) => {
    const date = new Date(d)
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  const filtered = incidents
    .filter((i) => {
      if (search && !i.description.toLowerCase().includes(search.toLowerCase()) && !i.location?.toLowerCase().includes(search.toLowerCase())) return false
      if (typeFilter && i.incident_type !== typeFilter) return false
      return true
    })

  return (
    <DashboardLayout title="Incident Timeline" subtitle={`${incidents.length} incident${incidents.length !== 1 ? 's' : ''} documented`} backHref="/dashboard/dv-log">
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
                className="w-full rounded-lg border border-gray-200 bg-white/60 py-2 pl-9 pr-3 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                placeholder="Search incidents..."
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white/60 px-3 py-2 text-sm focus:border-red-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">All Types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => navigate('/dashboard/dv-log/add')}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            Log Incident
          </button>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 sm:p-12 text-center dark:bg-black dark:border-gray-700">
            <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              {incidents.length === 0 ? 'No incidents logged' : 'No matching incidents'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {incidents.length === 0 ? 'Document incidents as they occur.' : 'Try adjusting your filters.'}
            </p>
            {incidents.length === 0 && (
              <button
                onClick={() => navigate('/dashboard/dv-log/add')}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Log First Incident
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 hidden sm:block dark:bg-gray-700" />

            <div className="space-y-4">
              {filtered.map((inc) => (
                <div key={inc.id} className="group relative sm:pl-12">
                  {/* Timeline dot */}
                  <div className={`absolute left-3.5 top-5 hidden sm:block h-3 w-3 rounded-full ring-4 ring-white dark:ring-black ${TIMELINE_COLORS[inc.incident_type] || 'bg-gray-400'}`} />

                  <div className="rounded-lg border border-gray-200/60 bg-white/60 hover:bg-white/90 hover:shadow-sm transition-all dark:bg-black dark:border-gray-700 dark:hover:bg-gray-900">
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[inc.incident_type] || TYPE_COLORS.other}`}>
                              {TYPE_LABELS[inc.incident_type] || inc.incident_type}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Calendar className="h-3 w-3" />
                              {formatDate(inc.incident_date)} at {formatTime(inc.incident_date)}
                            </span>
                            {inc.location && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <MapPin className="h-3 w-3" />
                                {inc.location}
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap dark:text-gray-300">{inc.description}</p>

                          {/* Actions row */}
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleGenerateComplaint(inc.id)}
                              disabled={generatingComplaint === inc.id}
                              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50 dark:bg-black dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white"
                            >
                              {generatingComplaint === inc.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              Police Complaint
                            </button>
                          </div>
                        </div>

                        {/* Edit / Delete */}
                        <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/dashboard/dv-log/edit/${inc.id}`)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors touch-manipulation dark:hover:bg-gray-800 dark:hover:text-gray-300"
                            aria-label="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(inc.id)}
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
          </div>
        )}
      </div>
      <ConfirmModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Delete this incident?"
        message="This incident record will be permanently removed. This action cannot be undone."
      />
    </DashboardLayout>
  )
}
