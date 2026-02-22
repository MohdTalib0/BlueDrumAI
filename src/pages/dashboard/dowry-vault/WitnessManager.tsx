import { useState, useEffect, useRef } from 'react'
import { Users, Plus, Trash2, Phone, Mail, MapPin, UserPlus, Loader2, AlertCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { getEdgeFunctionUrl } from '../../../lib/api'
import ConfirmModal from '../../../components/ui/ConfirmModal'

interface Witness {
  id: string
  name: string
  phone: string | null
  email: string | null
  relationship: string | null
  address: string | null
  notes: string | null
  created_at: string
}

const RELATIONSHIPS = [
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
  { value: 'neighbor', label: 'Neighbor' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'relative', label: 'Relative' },
  { value: 'other', label: 'Other' },
]

const REL_COLORS: Record<string, string> = {
  family: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  friend: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  neighbor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  colleague: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  relative: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

export default function WitnessManager() {
  const { sessionToken } = useAuth()
  const [witnesses, setWitnesses] = useState<Witness[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
    address: '',
    notes: '',
  })

  useEffect(() => {
    const controller = new AbortController()
    loadWitnesses(controller.signal)
    return () => { controller.abort() }
  }, [])

  const loadWitnesses = async (signal?: AbortSignal) => {
    try {
      if (!sessionToken) return
      const res = await fetch(`${getEdgeFunctionUrl('dowry')}/witnesses`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
        signal,
      })
      if (!res.ok) throw new Error('Failed to load witnesses')
      const data = await res.json()
      setWitnesses(data.witnesses || [])
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Failed to load witnesses')
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
      const res = await fetch(`${getEdgeFunctionUrl('dowry')}/witness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          relationship: form.relationship || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to add witness' }))
        throw new Error(errData.error || 'Failed to add witness')
      }

      toast.success('Witness added!')
      setForm({ name: '', phone: '', email: '', relationship: '', address: '', notes: '' })
      setShowForm(false)
      setLoading(true)
      loadWitnesses().finally(() => setLoading(false))
    } catch (err: any) {
      toast.error(err.message || 'Failed to add witness')
      setError(err.message || 'Failed to add witness')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (witnessId: string) => {
    setDeleteConfirmId(null)
    const prev = [...witnesses]
    setWitnesses((w) => w.filter((x) => x.id !== witnessId))

    try {
      if (!sessionToken) throw new Error('Not authenticated')
      const res = await fetch(`${getEdgeFunctionUrl('dowry')}/witness/${witnessId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Witness removed')
    } catch (err: any) {
      setWitnesses(prev)
      toast.error(err.message || 'Failed to delete')
    }
  }

  return (
    <DashboardLayout title="Witness Manager" subtitle={`${witnesses.length} witness${witnesses.length !== 1 ? 'es' : ''} on record`} backHref="/dashboard/dowry-vault">
      <div className="w-full max-w-4xl mx-auto space-y-4">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm dark:bg-black dark:border-red-700/40 dark:text-red-300">
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
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
          >
            {showForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'Add Witness'}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div ref={formRef} className="rounded-lg border-2 border-purple-200 bg-purple-50/30 p-4 sm:p-6 shadow-sm dark:bg-black dark:border-purple-700">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              New Witness
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Relationship</label>
                  <select
                    value={form.relationship}
                    onChange={(e) => setForm((p) => ({ ...p, relationship: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                  >
                    <option value="">Select...</option>
                    {RELATIONSHIPS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                  placeholder="Full address"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                  placeholder="Any additional context about this witness..."
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60 transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Witness
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Witnesses List */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : witnesses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 sm:p-12 text-center dark:bg-black dark:border-gray-700">
            <Users className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No witnesses added</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add people who can corroborate your documentation.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Add First Witness
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {witnesses.map((w) => (
              <div
                key={w.id}
                className="group rounded-lg border border-gray-200/60 bg-white/60 hover:bg-white/90 hover:shadow-sm transition-all p-4 sm:p-5 dark:bg-black dark:border-gray-700 dark:hover:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600 font-bold text-sm dark:bg-purple-900/30 dark:text-purple-400">
                      {w.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{w.name}</h4>
                        {w.relationship && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REL_COLORS[w.relationship] || REL_COLORS.other}`}>
                            {RELATIONSHIPS.find((r) => r.value === w.relationship)?.label || w.relationship}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        {w.phone && (
                          <a href={`tel:${w.phone}`} className="inline-flex items-center gap-1 hover:text-purple-600 transition-colors dark:hover:text-purple-400">
                            <Phone className="h-3 w-3" />
                            {w.phone}
                          </a>
                        )}
                        {w.email && (
                          <a href={`mailto:${w.email}`} className="inline-flex items-center gap-1 hover:text-purple-600 transition-colors dark:hover:text-purple-400">
                            <Mail className="h-3 w-3" />
                            {w.email}
                          </a>
                        )}
                        {w.address && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">{w.address}</span>
                          </span>
                        )}
                      </div>
                      {w.notes && (
                        <p className="mt-1.5 text-xs text-gray-400 italic truncate">{w.notes}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteConfirmId(w.id)}
                    className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 transition-all touch-manipulation dark:hover:bg-red-900/30 dark:hover:text-red-400"
                    aria-label="Remove witness"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 sm:p-5 dark:bg-black dark:border-blue-700/40">
          <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-300">Why Witnesses Matter</h3>
          <ul className="space-y-1.5 text-sm text-blue-800 dark:text-blue-300">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Witnesses can testify to gifts given, demands made, or transfers conducted</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Courts give significant weight to witness statements in dowry cases</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Keep their contact information up-to-date for legal proceedings</span>
            </li>
          </ul>
        </div>
      </div>
      <ConfirmModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Remove this witness?"
        message="This witness record will be permanently removed. This action cannot be undone."
      />
    </DashboardLayout>
  )
}
