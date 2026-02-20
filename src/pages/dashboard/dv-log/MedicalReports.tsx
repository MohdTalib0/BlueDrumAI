import { useState, useEffect, useRef } from 'react'
import { FileHeart, Plus, Trash2, Calendar, Building2, Stethoscope, Loader2, AlertCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { getEdgeFunctionUrl } from '../../../lib/api'
import ConfirmModal from '../../../components/ui/ConfirmModal'

interface MedicalReport {
  id: string
  incident_id: string | null
  report_date: string
  hospital_name: string | null
  doctor_name: string | null
  diagnosis: string
  file_url: string | null
  notes: string | null
  created_at: string
}

export default function MedicalReports() {
  const { sessionToken } = useAuth()
  const [reports, setReports] = useState<MedicalReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    report_date: new Date().toISOString().slice(0, 10),
    hospital_name: '',
    doctor_name: '',
    diagnosis: '',
    notes: '',
  })

  useEffect(() => {
    const controller = new AbortController()
    loadReports(controller.signal)
    return () => { controller.abort() }
  }, [])

  const loadReports = async (signal?: AbortSignal) => {
    try {
      if (!sessionToken) return
      const res = await fetch(`${getEdgeFunctionUrl('dv')}/medical-reports`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
        signal,
      })
      if (!res.ok) throw new Error('Failed to load reports')
      const data = await res.json()
      setReports(data.reports || [])
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (!sessionToken) throw new Error('Not authenticated')
      const res = await fetch(`${getEdgeFunctionUrl('dv')}/medical-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          report_date: form.report_date,
          hospital_name: form.hospital_name.trim() || null,
          doctor_name: form.doctor_name.trim() || null,
          diagnosis: form.diagnosis.trim(),
          notes: form.notes.trim() || null,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to add report' }))
        throw new Error(errData.error || 'Failed to add report')
      }

      toast.success('Medical report added!')
      setForm({ report_date: new Date().toISOString().slice(0, 10), hospital_name: '', doctor_name: '', diagnosis: '', notes: '' })
      setShowForm(false)
      setLoading(true)
      loadReports().finally(() => setLoading(false))
    } catch (err: any) {
      toast.error(err.message || 'Failed to add report')
      setError(err.message || 'Failed to add report')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (reportId: string) => {
    setDeleteConfirmId(null)
    const prev = [...reports]
    setReports((r) => r.filter((x) => x.id !== reportId))

    try {
      if (!sessionToken) throw new Error('Not authenticated')
      const res = await fetch(`${getEdgeFunctionUrl('dv')}/medical-report/${reportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Report deleted')
    } catch (err: any) {
      setReports(prev)
      toast.error(err.message || 'Failed to delete')
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <DashboardLayout title="Medical Reports" subtitle={`${reports.length} report${reports.length !== 1 ? 's' : ''} on file`} backHref="/dashboard/dv-log">
      <div className="w-full max-w-4xl mx-auto space-y-4">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Add Button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setShowForm(!showForm)
              if (!showForm) setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
            }}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'Add Report'}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div ref={formRef} className="rounded-lg border-2 border-red-200 bg-red-50/30 p-4 sm:p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <FileHeart className="h-5 w-5 text-red-600" />
              New Medical Report
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Report Date *</label>
                  <input
                    type="date"
                    value={form.report_date}
                    onChange={(e) => setForm((p) => ({ ...p, report_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Hospital / Clinic</label>
                  <input
                    type="text"
                    value={form.hospital_name}
                    onChange={(e) => setForm((p) => ({ ...p, hospital_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                    placeholder="Name of hospital or clinic"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Doctor Name</label>
                  <input
                    type="text"
                    value={form.doctor_name}
                    onChange={(e) => setForm((p) => ({ ...p, doctor_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                    placeholder="Treating doctor's name"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Diagnosis / Injuries *</label>
                <textarea
                  value={form.diagnosis}
                  onChange={(e) => setForm((p) => ({ ...p, diagnosis: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                  placeholder="Describe injuries, diagnosis, and treatment given..."
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                  placeholder="Any additional notes..."
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Report
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Reports List */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 sm:p-12 text-center">
            <FileHeart className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700">No medical reports</h3>
            <p className="mt-1 text-sm text-gray-500">Upload and organize medical documentation here.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add First Report
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="group rounded-lg border border-gray-200/60 bg-white/60 hover:bg-white/90 hover:shadow-sm transition-all p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <FileHeart className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-gray-900 line-clamp-1">{r.diagnosis}</h4>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(r.report_date)}
                        </span>
                        {r.hospital_name && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {r.hospital_name}
                          </span>
                        )}
                        {r.doctor_name && (
                          <span className="inline-flex items-center gap-1">
                            <Stethoscope className="h-3 w-3" />
                            Dr. {r.doctor_name}
                          </span>
                        )}
                      </div>
                      {r.notes && (
                        <p className="mt-1.5 text-xs text-gray-400 italic truncate">{r.notes}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteConfirmId(r.id)}
                    className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 transition-all touch-manipulation"
                    aria-label="Delete report"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 sm:p-5">
          <h3 className="mb-2 font-semibold text-blue-900">Why Medical Reports Matter</h3>
          <ul className="space-y-1.5 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Medical reports serve as critical evidence in domestic violence cases</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Always get a medical examination within 24 hours of an incident</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Ask the doctor to note that injuries are consistent with domestic violence</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Keep original copies safe and maintain records of all hospital visits</span>
            </li>
          </ul>
        </div>
      </div>
      <ConfirmModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Delete medical report?"
        message="This report will be permanently removed. This action cannot be undone."
      />
    </DashboardLayout>
  )
}
