import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Gift, Save, Calendar, IndianRupee, FileText, Loader2, AlertCircle, CheckCircle2, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { getEdgeFunctionUrl, apiFetch } from '../../../lib/api'

interface DowryData {
  item_description: string
  value: number | null
  gift_date: string
  transfer_type: string
}

const TRANSFER_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'property', label: 'Property' },
  { value: 'other', label: 'Other' },
]

export default function DowryForm() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isEditMode = !!id

  const [formData, setFormData] = useState<DowryData>({
    item_description: '',
    value: null,
    gift_date: '',
    transfer_type: '',
  })

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isEditMode) return
    const controller = new AbortController()
    loadEntry(controller.signal)
    return () => { controller.abort() }
  }, [id])

  const loadEntry = async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      if (!sessionToken) throw new Error('Not authenticated')

      const res = await apiFetch(`${getEdgeFunctionUrl('dowry')}/entry/${id}`, sessionToken, {
        signal,
      })
      if (!res.ok) throw new Error('Failed to load entry')
      const data = await res.json()
      if (data.entry) {
        setFormData({
          item_description: data.entry.item_description || '',
          value: data.entry.value ?? null,
          gift_date: data.entry.gift_date || '',
          transfer_type: data.entry.transfer_type || '',
        })
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Failed to load entry')
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
        item_description: formData.item_description.trim(),
        value: formData.value,
        gift_date: formData.gift_date || null,
        transfer_type: formData.transfer_type || null,
      }

      const url = isEditMode
        ? `${getEdgeFunctionUrl('dowry')}/entry/${id}`
        : `${getEdgeFunctionUrl('dowry')}/entry`

      const res = await apiFetch(url, sessionToken, {
        method: isEditMode ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to save' }))
        throw new Error(errData.error || 'Failed to save')
      }

      setSuccess(true)
      toast.success(isEditMode ? 'Entry updated!' : 'Entry added!')
      navigateTimerRef.current = setTimeout(() => {
        navigate('/dashboard/dowry-vault/gifts')
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
      <DashboardLayout title="Edit Entry" subtitle="Update dowry entry" backHref="/dashboard/dowry-vault/gifts">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mb-4 inline-block h-8 w-8 animate-spin text-purple-600" />
            <p className="text-gray-600 dark:text-gray-400">Loading entry...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title={isEditMode ? 'Edit Dowry Entry' : 'Add Dowry Entry'}
      subtitle={isEditMode ? 'Update gift or transfer details' : 'Document a gift, transfer, or demand'}
      backHref="/dashboard/dowry-vault"
    >
      <div className="w-full max-w-3xl mx-auto">
        {success && (
          <div className="mb-6 animate-in slide-in-from-top-5 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 shadow-sm dark:bg-black dark:border-green-700/40 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">{isEditMode ? 'Entry updated!' : 'Entry added!'}</p>
              <p className="text-sm text-green-700 dark:text-green-400">Redirecting to gift tracker...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 animate-in slide-in-from-top-5 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm dark:bg-black dark:border-red-700/40 dark:text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Description */}
          <div className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-4 sm:p-6 shadow-sm dark:bg-black dark:border-gray-700 dark:hover:bg-gray-900">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <Gift className="h-4 w-4" />
              Item Description *
            </label>
            <input
              type="text"
              value={formData.item_description}
              onChange={(e) => setFormData((p) => ({ ...p, item_description: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors dark:bg-black dark:border-gray-600 dark:text-gray-100"
              placeholder="e.g., Gold necklace set, Cash payment for wedding"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Describe the gift, item, or transfer clearly</p>
          </div>

          {/* Value & Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-4 sm:p-6 shadow-sm dark:bg-black dark:border-gray-700 dark:hover:bg-gray-900">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <IndianRupee className="h-4 w-4" />
                Estimated Value (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.value ?? ''}
                onChange={(e) => setFormData((p) => ({ ...p, value: e.target.value ? parseFloat(e.target.value) : null }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors dark:bg-black dark:border-gray-600 dark:text-gray-100"
                placeholder="0.00"
              />
            </div>

            <div className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-4 sm:p-6 shadow-sm dark:bg-black dark:border-gray-700 dark:hover:bg-gray-900">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Calendar className="h-4 w-4" />
                Date of Gift / Transfer
              </label>
              <input
                type="date"
                value={formData.gift_date}
                onChange={(e) => setFormData((p) => ({ ...p, gift_date: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors dark:bg-black dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Transfer Type */}
          <div className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-4 sm:p-6 shadow-sm dark:bg-black dark:border-gray-700 dark:hover:bg-gray-900">
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <Tag className="h-4 w-4" />
              Type of Transfer
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TRANSFER_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, transfer_type: p.transfer_type === t.value ? '' : t.value }))}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                    formData.transfer_type === t.value
                      ? 'border-purple-500 bg-purple-50 text-purple-700 ring-1 ring-purple-500 dark:bg-purple-900/30 dark:text-purple-300'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:bg-black dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Card */}
          {formData.item_description && (
            <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50/80 to-purple-100/40 p-4 sm:p-6 shadow-sm dark:from-black dark:to-black dark:border-purple-700">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate dark:text-white">{formData.item_description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    {formData.value != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-purple-700 font-medium dark:bg-purple-900/30 dark:text-purple-300">
                        ₹{formData.value.toLocaleString('en-IN')}
                      </span>
                    )}
                    {formData.transfer_type && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {TRANSFER_TYPES.find((t) => t.value === formData.transfer_type)?.label}
                      </span>
                    )}
                    {formData.gift_date && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {new Date(formData.gift_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode ? 'Update Entry' : 'Save Entry'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/dowry-vault/gifts')}
              className="min-h-[44px] w-full sm:w-auto rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors dark:bg-black dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-900"
            >
              View All Gifts
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
