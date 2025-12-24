import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TrendingUp, Save, Calendar, DollarSign, FileText, Loader2, AlertCircle, CheckCircle2, Copy, Sparkles, Info } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'

interface IncomeData {
  month_year: string // Format: YYYY-MM
  gross_income: number
  deductions: {
    income_tax?: number
    pf?: number
    professional_tax?: number
    other?: number
  }
  expenses: {
    emi?: number
    medical?: number
    parents?: number
    rent?: number
    utilities?: number
    other?: number
  }
  notes?: string
}

export default function IncomeForm() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [loadingPrevious, setLoadingPrevious] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [previousMonths, setPreviousMonths] = useState<IncomeData[]>([])
  const [showCopyMenu, setShowCopyMenu] = useState(false)
  const [formData, setFormData] = useState<IncomeData>({
    month_year: new Date().toISOString().slice(0, 7), // Current month
    gross_income: 0,
    deductions: {},
    expenses: {},
    notes: '',
  })

  const isEditMode = !!id

  useEffect(() => {
    if (isEditMode) {
      loadEntry()
    } else {
      loadPreviousMonths()
    }
  }, [id])

  const loadEntry = async () => {
    try {
      setLoading(true)
      if (!sessionToken) {
        throw new Error('Not authenticated')
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      const response = await fetch(`${apiBase}/api/income/history`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load entry')
      }

      const data = await response.json()
      const entry = data.entries?.find((e: any) => e.id === id)
      if (entry) {
        setFormData({
          month_year: entry.month_year,
          gross_income: entry.gross_income,
          deductions: entry.deductions || {},
          expenses: entry.expenses || {},
          notes: entry.notes || '',
        })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load entry')
    } finally {
      setLoading(false)
    }
  }

  const loadPreviousMonths = async () => {
    try {
      if (!sessionToken) return

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      const response = await fetch(`${apiBase}/api/income/history`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPreviousMonths(data.entries || [])
      }
    } catch (err) {
      // Silent fail for previous months
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      if (!sessionToken) {
        throw new Error('Not authenticated')
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      const response = await fetch(`${apiBase}/api/income/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save income data' }))
        throw new Error(errorData.error || 'Failed to save income data')
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/dashboard/income-tracker/history')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to save income data')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyFromPrevious = async (monthYear: string) => {
    try {
      setLoadingPrevious(true)
      const previous = previousMonths.find((m) => m.month_year === monthYear)
      if (previous) {
        setFormData({
          ...previous,
          month_year: formData.month_year, // Keep current month
          notes: '', // Clear notes
        })
        setShowCopyMenu(false)
      }
    } catch (err) {
      setError('Failed to copy from previous month')
    } finally {
      setLoadingPrevious(false)
    }
  }

  const updateDeduction = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      deductions: {
        ...prev.deductions,
        [key]: value ? parseFloat(value) : undefined,
      },
    }))
  }

  const updateExpense = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      expenses: {
        ...prev.expenses,
        [key]: value ? parseFloat(value) : undefined,
      },
    }))
  }

  const calculateDisposable = () => {
    const gross = formData.gross_income || 0
    const totalDeductions = Object.values(formData.deductions).reduce((sum, val) => sum + (val || 0), 0)
    const totalExpenses = Object.values(formData.expenses).reduce((sum, val) => sum + (val || 0), 0)
    return Math.max(0, gross - totalDeductions - totalExpenses)
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const totalDeductions = Object.values(formData.deductions).reduce((sum, val) => sum + (val || 0), 0)
  const totalExpenses = Object.values(formData.expenses).reduce((sum, val) => sum + (val || 0), 0)
  const disposableIncome = calculateDisposable()

  if (loading && isEditMode) {
    return (
      <DashboardLayout title="Edit Income Entry" subtitle="Update your income and expense data">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mb-4 inline-block h-8 w-8 animate-spin text-primary-600" />
            <p className="text-gray-600">Loading entry...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={isEditMode ? 'Edit Income Entry' : 'Income Tracker'} subtitle={isEditMode ? 'Update your income and expense data' : 'Log your monthly income and expenses'}>
      <div className="w-full max-w-5xl mx-auto">
        {/* Success Message */}
        {success && (
          <div className="mb-6 animate-in slide-in-from-top-5 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 shadow-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Income data saved successfully!</p>
              <p className="text-sm text-green-700">Redirecting to history...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 animate-in slide-in-from-top-5 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Stats Bar */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Gross Income</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(formData.gross_income || 0)}</p>
          </div>
          <div className="rounded-lg border border-red-200/20 bg-red-50/50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Deductions</p>
            <p className="mt-1 text-xl font-bold text-red-700">-{formatCurrency(totalDeductions)}</p>
          </div>
          <div className="rounded-lg border border-orange-200/20 bg-orange-50/50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Expenses</p>
            <p className="mt-1 text-xl font-bold text-orange-700">-{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Disposable</p>
            <p className="mt-1 text-xl font-bold text-primary-700">{formatCurrency(disposableIncome)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Month Selection & Copy */}
          <div className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Calendar className="h-4 w-4" />
                Month & Year
              </label>
              {!isEditMode && previousMonths.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCopyMenu(!showCopyMenu)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy from Previous
                  </button>
                  {showCopyMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowCopyMenu(false)} />
                      <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
                        <div className="p-2">
                          <p className="px-2 py-1 text-xs font-semibold text-gray-500">Select Month:</p>
                          {previousMonths.slice(0, 6).map((entry) => {
                            const monthDate = new Date(entry.month_year + '-01')
                            return (
                              <button
                                key={entry.month_year}
                                type="button"
                                onClick={() => handleCopyFromPrevious(entry.month_year)}
                                disabled={loadingPrevious}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                              >
                                {monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <input
              type="month"
              value={formData.month_year}
              onChange={(e) => setFormData((prev) => ({ ...prev, month_year: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
              required
              disabled={isEditMode}
            />
          </div>

          {/* Gross Income */}
          <div className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-6 shadow-sm">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <DollarSign className="h-4 w-4" />
              Gross Income (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.gross_income || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, gross_income: parseFloat(e.target.value) || 0 }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
              placeholder="Enter gross monthly income"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Your total monthly income before deductions</p>
          </div>

          {/* Deductions */}
          <div className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <FileText className="h-4 w-4" />
                Statutory Deductions
              </h3>
              {totalDeductions > 0 && (
                <span className="text-sm font-semibold text-red-600">Total: {formatCurrency(totalDeductions)}</span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-600">Income Tax (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.deductions.income_tax || ''}
                  onChange={(e) => updateDeduction('income_tax', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">Provident Fund (PF) (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.deductions.pf || ''}
                  onChange={(e) => updateDeduction('pf', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">Professional Tax (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.deductions.professional_tax || ''}
                  onChange={(e) => updateDeduction('professional_tax', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">Other Deductions (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.deductions.other || ''}
                  onChange={(e) => updateDeduction('other', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <TrendingUp className="h-4 w-4" />
                Monthly Expenses
              </h3>
              {totalExpenses > 0 && (
                <span className="text-sm font-semibold text-orange-600">Total: {formatCurrency(totalExpenses)}</span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-600">EMI / Loan Payments (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.expenses.emi || ''}
                  onChange={(e) => updateExpense('emi', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">Medical Expenses (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.expenses.medical || ''}
                  onChange={(e) => updateExpense('medical', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">Parents Support (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.expenses.parents || ''}
                  onChange={(e) => updateExpense('parents', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">Rent (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.expenses.rent || ''}
                  onChange={(e) => updateExpense('rent', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">Utilities (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.expenses.utilities || ''}
                  onChange={(e) => updateExpense('utilities', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">Other Expenses (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.expenses.other || ''}
                  onChange={(e) => updateExpense('other', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Disposable Income Calculation */}
          <div className="rounded-lg border-2 border-primary-200 bg-gradient-to-br from-primary-50/80 to-primary-100/40 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-primary-600" />
                  <p className="text-sm font-semibold text-gray-700">Disposable Income</p>
                </div>
                <p className="text-3xl font-bold text-primary-700">{formatCurrency(disposableIncome)}</p>
                <p className="mt-2 text-xs text-gray-600">Gross Income - Deductions - Expenses</p>
              </div>
              <div className="hidden sm:block">
                <TrendingUp className="h-16 w-16 text-primary-600/30" />
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50/50 p-3">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
              <p className="text-xs text-blue-800">
                This calculation follows the <strong>Rajnesh v. Neha</strong> Supreme Court guidelines for determining disposable income for maintenance purposes.
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-6 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-gray-700">Additional Notes (Optional)</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
              placeholder="Add any additional notes or context (e.g., one-time expenses, bonuses, etc.)..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode ? 'Update Income Data' : 'Save Income Data'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/income-tracker/history')}
              className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View History
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
