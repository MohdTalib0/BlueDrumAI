import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ShieldAlert, Save, Calendar, MapPin, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { getEdgeFunctionUrl } from '../../../lib/api'

interface IncidentData {
  incident_date: string
  incident_type: string
  description: string
  location: string
}

const INCIDENT_TYPES = [
  { value: 'physical', label: 'Physical', desc: 'Hitting, slapping, pushing' },
  { value: 'emotional', label: 'Emotional', desc: 'Verbal abuse, humiliation' },
  { value: 'financial', label: 'Financial', desc: 'Withholding money, control' },
  { value: 'sexual', label: 'Sexual', desc: 'Forced acts, marital rape' },
  { value: 'threat', label: 'Threats', desc: 'Intimidation, coercion' },
  { value: 'other', label: 'Other', desc: 'Any other form' },
]

export default function IncidentForm() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isEditMode = !!id

  const [formData, setFormData] = useState<IncidentData>(() => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    return {
      incident_date: local.toISOString().slice(0, 16),
      incident_type: '',
      description: '',
      location: '',
    }
  })

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isEditMode) return
    const controller = new AbortController()
    loadIncident(controller.signal)
    return () => { controller.abort() }
  }, [id])

  const loadIncident = async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      if (!sessionToken) throw new Error('Not authenticated')
      const res = await fetch(`${getEdgeFunctionUrl('dv')}/incident/${id}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
        signal,
      })
      if (!res.ok) throw new Error('Failed to load incident')
      const data = await res.json()
      if (data.incident) {
        const d = data.incident
        setFormData({
          incident_date: d.incident_date ? d.incident_date.slice(0, 16) : '',
          incident_type: d.incident_type || '',
          description: d.description || '',
          location: d.location || '',
        })
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      if (!sessionToken) throw new Error('Not authenticated')

      const payload = {
        incident_date: formData.incident_date ? new Date(formData.incident_date).toISOString() : null,
        incident_type: formData.incident_type,
        description: formData.description.trim(),
        location: formData.location.trim() || null,
      }

      const url = isEditMode
        ? `${getEdgeFunctionUrl('dv')}/incident/${id}`
        : `${getEdgeFunctionUrl('dv')}/incident`

      const res = await fetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to save' }))
        throw new Error(errData.error || 'Failed to save')
      }

      setSuccess(true)
      toast.success(isEditMode ? 'Incident updated!' : 'Incident logged!')
      navigateTimerRef.current = setTimeout(() => {
        navigate('/dashboard/dv-log/timeline')
      }, 1200)
    } catch (err: any) {
      setError(err.message || 'Failed to save')
      toast.error(err.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  if (loading && isEditMode) {
    return (
      <DashboardLayout title="Edit Incident" subtitle="Update incident details" backHref="/dashboard/dv-log/timeline">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="mb-4 inline-block h-8 w-8 animate-spin text-red-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title={isEditMode ? 'Edit Incident' : 'Log Incident'}
      subtitle={isEditMode ? 'Update details of this incident' : 'Document what happened — the more detail, the stronger the evidence'}
      backHref="/dashboard/dv-log"
    >
      <div className="w-full max-w-3xl mx-auto">
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 shadow-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">{isEditMode ? 'Incident updated!' : 'Incident logged!'}</p>
              <p className="text-sm text-green-700">Redirecting to timeline...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Incident Type */}
          <div className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-4 sm:p-6 shadow-sm">
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <ShieldAlert className="h-4 w-4" />
              Type of Incident *
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INCIDENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, incident_type: t.value }))}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    formData.incident_type === t.value
                      ? 'border-red-500 bg-red-50 ring-1 ring-red-500'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <p className={`text-sm font-medium ${formData.incident_type === t.value ? 'text-red-700' : 'text-gray-700'}`}>{t.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Location */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-4 sm:p-6 shadow-sm">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Calendar className="h-4 w-4" />
                Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.incident_date}
                onChange={(e) => setFormData((p) => ({ ...p, incident_date: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-4 sm:p-6 shadow-sm">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <MapPin className="h-4 w-4" />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
                placeholder="e.g., Home, In-law's house"
              />
            </div>
          </div>

          {/* Description */}
          <div className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-4 sm:p-6 shadow-sm">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileText className="h-4 w-4" />
              What Happened *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={6}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
              placeholder="Describe the incident in as much detail as possible — who was involved, what happened, any injuries, what was said..."
              required
            />
            <p className="mt-1 text-xs text-gray-500">The more detail you provide, the stronger your documentation will be for legal proceedings.</p>
          </div>

          {/* Guidance Box */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <h4 className="text-sm font-semibold text-amber-900 mb-1">Documentation Tips</h4>
            <ul className="text-xs text-amber-800 space-y-1">
              <li>• Include exact time, sequence of events, and words spoken</li>
              <li>• Note any witnesses who were present</li>
              <li>• Describe any physical injuries in detail</li>
              <li>• Mention if you sought medical attention or called anyone</li>
            </ul>
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <button
              type="submit"
              disabled={loading || !formData.incident_type}
              className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode ? 'Update Incident' : 'Log Incident'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/dv-log/timeline')}
              className="min-h-[44px] w-full sm:w-auto rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View Timeline
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
