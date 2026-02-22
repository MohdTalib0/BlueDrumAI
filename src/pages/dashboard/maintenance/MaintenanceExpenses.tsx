import { useState, useEffect } from 'react'
import { Receipt, Plus, Trash2, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { getEdgeFunctionUrl } from '../../../lib/api'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  frequency: string
  beneficiary: string | null
  expense_date: string | null
  notes: string | null
  created_at: string
}

const CATEGORIES = [
  { value: 'education', label: 'Education' },
  { value: 'medical', label: 'Medical' },
  { value: 'housing', label: 'Housing / Rent' },
  { value: 'food', label: 'Food & Groceries' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'transport', label: 'Transport' },
  { value: 'childcare', label: 'Childcare' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'legal', label: 'Legal Fees' },
  { value: 'other', label: 'Other' },
]

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One-time' },
]

const BENEFICIARIES = [
  { value: 'self', label: 'Self' },
  { value: 'child', label: 'Child' },
  { value: 'household', label: 'Household' },
]

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  one_time: 'One-time',
}

export default function MaintenanceExpenses() {
  const { sessionToken } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    category: 'education',
    description: '',
    amount: 0,
    frequency: 'monthly',
    beneficiary: '',
    expense_date: '',
    notes: '',
  })

  useEffect(() => {
    const controller = new AbortController()
    loadExpenses(controller.signal)
    return () => { controller.abort() }
  }, [])

  const loadExpenses = async (signal?: AbortSignal) => {
    try {
      if (!sessionToken) return
      setLoading(true)
      const res = await fetch(`${getEdgeFunctionUrl('maintenance')}/expenses`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
        signal,
      })
      if (!res.ok) throw new Error('Failed to load expenses')
      const data = await res.json()
      setExpenses(data.expenses || [])
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.description.trim()) {
      setError('Description is required')
      return
    }
    if (form.amount <= 0) {
      setError('Amount must be greater than zero')
      return
    }
    if (!sessionToken) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`${getEdgeFunctionUrl('maintenance')}/expense`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          amount: form.amount,
          beneficiary: form.beneficiary || undefined,
          expense_date: form.expense_date || undefined,
          notes: form.notes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to save expense' }))
        throw new Error(data.error || 'Failed to save expense')
      }

      setSuccess('Expense added successfully')
      setShowForm(false)
      setForm({ category: 'education', description: '', amount: 0, frequency: 'monthly', beneficiary: '', expense_date: '', notes: '' })
      await loadExpenses()
    } catch (err: any) {
      setError(err.message || 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!sessionToken) return
    setDeletingId(id)
    setError('')

    try {
      const res = await fetch(`${getEdgeFunctionUrl('maintenance')}/expense/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
      if (!res.ok) throw new Error('Failed to delete expense')
      setExpenses((prev) => prev.filter((e) => e.id !== id))
      setSuccess('Expense deleted')
    } catch (err: any) {
      setError(err.message || 'Failed to delete expense')
    } finally {
      setDeletingId(null)
    }
  }

  const formatCurrency = (v: number) =>
    `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  const totalMonthly = expenses.reduce((sum, e) => {
    const mult: Record<string, number> = { monthly: 1, quarterly: 1 / 3, yearly: 1 / 12, one_time: 0 }
    return sum + e.amount * (mult[e.frequency] ?? 1)
  }, 0)

  return (
    <DashboardLayout title="Expense Tracker" subtitle="Document expenses for maintenance claims" backHref="/dashboard/maintenance">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm dark:bg-black dark:border-red-700/40 dark:text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"><X className="h-4 w-4" /></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 shadow-sm dark:bg-black dark:border-green-700/40 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Summary Bar */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200/20 bg-white/50 p-4 shadow-sm dark:bg-black dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Monthly Expenses</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(Math.round(totalMonthly))}</p>
            <p className="text-xs text-gray-400">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} documented</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors touch-manipulation"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'Add Expense'}
          </button>
        </div>

        {/* Add Expense Form */}
        {showForm && (
          <div className="rounded-lg border-2 border-teal-200 bg-teal-50/30 p-4 sm:p-6 shadow-sm animate-in slide-in-from-top-3 dark:bg-black dark:border-teal-700">
            <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">New Expense</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Frequency</label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Beneficiary</label>
                  <select
                    value={form.beneficiary}
                    onChange={(e) => setForm((f) => ({ ...f, beneficiary: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                  >
                    <option value="">Select...</option>
                    {BENEFICIARIES.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. School tuition for class 5"
                  maxLength={500}
                  className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.amount || ''}
                    onChange={(e) => setForm((f) => ({ ...f, amount: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Date (optional)</label>
                  <input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional details..."
                  rows={2}
                  maxLength={2000}
                  className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none resize-none dark:bg-black dark:border-gray-600 dark:text-gray-100"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full min-h-[44px] rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {saving ? <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" /> : <Plus className="mr-2 inline-block h-4 w-4" />}
                {saving ? 'Saving...' : 'Add Expense'}
              </button>
            </div>
          </div>
        )}

        {/* Expense List */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : expenses.length > 0 ? (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="group flex items-center gap-3 rounded-lg border border-gray-200/40 bg-white/50 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all dark:bg-black dark:border-gray-700"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-900/30">
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{expense.description}</p>
                    <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-400">
                      {CATEGORIES.find((c) => c.value === expense.category)?.label || expense.category}
                    </span>
                    {expense.beneficiary && (
                      <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                        {BENEFICIARIES.find((b) => b.value === expense.beneficiary)?.label || expense.beneficiary}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {FREQ_LABELS[expense.frequency] || expense.frequency}
                    {expense.expense_date && ` · ${new Date(expense.expense_date).toLocaleDateString('en-IN')}`}
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{formatCurrency(expense.amount)}</p>
                <button
                  onClick={() => handleDelete(expense.id)}
                  disabled={deletingId === expense.id}
                  className="sm:opacity-0 sm:group-hover:opacity-100 shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all touch-manipulation dark:hover:bg-red-900/30 dark:hover:text-red-400"
                >
                  {deletingId === expense.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 text-center dark:bg-black dark:border-gray-600">
            <Receipt className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">No expenses documented</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Start adding expenses to strengthen your maintenance claim.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
