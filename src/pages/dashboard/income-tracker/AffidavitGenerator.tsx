import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Download, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Calendar } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { format } from 'date-fns'

interface IncomeEntry {
  id: string
  month_year: string
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
  disposable_income: number
  notes?: string
}

export default function AffidavitGenerator() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<IncomeEntry[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError('')
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
        throw new Error('Failed to load income history')
      }

      const data = await response.json()
      setEntries(data.entries || [])
      if (data.entries && data.entries.length > 0) {
        setSelectedMonth(data.entries[0].month_year)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load income history')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedMonth) {
      setError('Please select a month to generate the affidavit')
      return
    }

    try {
      setGenerating(true)
      setError('')
      setSuccess(false)
      setDownloadUrl(null)

      if (!sessionToken) {
        throw new Error('Not authenticated')
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      const response = await fetch(`${apiBase}/api/income/generate-affidavit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ month_year: selectedMonth }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate affidavit' }))
        throw new Error(errorData.error || 'Failed to generate affidavit')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      setDownloadUrl(url)
      setSuccess(true)

      // Auto-download
      const a = document.createElement('a')
      a.href = url
      a.download = `income-affidavit-${selectedMonth}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message || 'Failed to generate affidavit')
    } finally {
      setGenerating(false)
    }
  }

  const selectedEntry = entries.find((e) => e.month_year === selectedMonth)

  if (loading) {
    return (
      <DashboardLayout title="Generate Affidavit" subtitle="Create a legally compliant income affidavit">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mb-4 inline-block h-8 w-8 animate-spin text-primary-600" />
            <p className="text-gray-600">Loading income data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Generate Affidavit" subtitle="Create a legally compliant income affidavit (Rajnesh v. Neha compliant)">
      <div className="w-full max-w-4xl mx-auto">
        {/* Success Message */}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Affidavit generated successfully!</p>
              <p className="text-sm text-green-700">Your PDF has been downloaded.</p>
            </div>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={`income-affidavit-${selectedMonth}.pdf`}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Download Again
              </a>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard/income-tracker/history')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </button>
        </div>

        {/* Month Selection */}
        <div className="mb-6 rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-6 shadow-sm">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Calendar className="h-4 w-4" />
            Select Month for Affidavit
          </label>
          {entries.length === 0 ? (
            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
              <p className="font-semibold">No income records found</p>
              <p className="mt-1 text-sm">Please add income data first before generating an affidavit.</p>
              <button
                onClick={() => navigate('/dashboard/income-tracker')}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Add Income Entry
              </button>
            </div>
          ) : (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              {entries.map((entry) => {
                const monthDate = new Date(entry.month_year + '-01')
                return (
                  <option key={entry.id} value={entry.month_year}>
                    {format(monthDate, 'MMMM yyyy')} - Disposable: ₹{entry.disposable_income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </option>
                )
              })}
            </select>
          )}
        </div>

        {/* Preview */}
        {selectedEntry && (
          <div className="mb-6 rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <FileText className="h-4 w-4" />
              Affidavit Preview
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-medium text-gray-600">Month:</span>
                <span className="font-semibold text-gray-900">{format(new Date(selectedEntry.month_year + '-01'), 'MMMM yyyy')}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-medium text-gray-600">Gross Income:</span>
                <span className="font-semibold text-gray-900">₹{selectedEntry.gross_income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-medium text-gray-600">Total Deductions:</span>
                <span className="font-semibold text-red-600">
                  ₹
                  {Object.values(selectedEntry.deductions)
                    .reduce((sum, val) => sum + (val || 0), 0)
                    .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-medium text-gray-600">Total Expenses:</span>
                <span className="font-semibold text-orange-600">
                  ₹
                  {Object.values(selectedEntry.expenses)
                    .reduce((sum, val) => sum + (val || 0), 0)
                    .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-b-2 border-primary-200 pb-2 pt-2">
                <span className="font-semibold text-gray-900">Disposable Income:</span>
                <span className="text-lg font-bold text-primary-700">₹{selectedEntry.disposable_income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-blue-50 p-3">
              <p className="text-xs font-semibold text-blue-900">Legal Compliance</p>
              <p className="mt-1 text-xs text-blue-800">
                This affidavit follows the Rajnesh v. Neha guidelines for calculating disposable income for maintenance purposes.
              </p>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedMonth || entries.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate Affidavit PDF
              </>
            )}
          </button>
        </div>

        {/* Info Section */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="mb-3 text-base font-semibold text-blue-900">About Income Affidavits</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Affidavits are legally binding documents used in court proceedings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>This affidavit follows the Rajnesh v. Neha Supreme Court guidelines for calculating disposable income</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Disposable income = Gross Income - Statutory Deductions - Necessary Expenses</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Review the generated PDF carefully before submitting to court</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Consult with your lawyer before filing any legal documents</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}

