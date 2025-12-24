import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ArrowLeft, Download, TrendingUp, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { format, parseISO, startOfYear, endOfYear, isWithinInterval } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

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

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']

export default function AnnualSummary() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<IncomeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [generatingPDF, setGeneratingPDF] = useState(false)

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
    } catch (err: any) {
      setError(err.message || 'Failed to load income history')
    } finally {
      setLoading(false)
    }
  }

  const calculateTotalDeductions = (deductions: IncomeEntry['deductions']) => {
    return Object.values(deductions).reduce((sum, val) => sum + (val || 0), 0)
  }

  const calculateTotalExpenses = (expenses: IncomeEntry['expenses']) => {
    return Object.values(expenses).reduce((sum, val) => sum + (val || 0), 0)
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Filter entries for selected year
  const yearEntries = useMemo(() => {
    const start = startOfYear(new Date(selectedYear, 0, 1))
    const end = endOfYear(new Date(selectedYear, 0, 1))
    return entries.filter((entry) => {
      const entryDate = parseISO(entry.month_year + '-01')
      return isWithinInterval(entryDate, { start, end })
    })
  }, [entries, selectedYear])

  // Calculate annual summary
  const summary = useMemo(() => {
    if (yearEntries.length === 0) return null

    const totalGross = yearEntries.reduce((sum, e) => sum + e.gross_income, 0)
    const totalDeductions = yearEntries.reduce((sum, e) => sum + calculateTotalDeductions(e.deductions), 0)
    const totalExpenses = yearEntries.reduce((sum, e) => sum + calculateTotalExpenses(e.expenses), 0)
    const totalDisposable = yearEntries.reduce((sum, e) => sum + e.disposable_income, 0)
    const avgDisposable = totalDisposable / yearEntries.length
    const avgGross = totalGross / yearEntries.length

    // Expense category breakdown
    const expenseCategories: { [key: string]: number } = {}
    yearEntries.forEach((entry) => {
      Object.entries(entry.expenses).forEach(([key, value]) => {
        if (value && value > 0) {
          const categoryName = key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')
          expenseCategories[categoryName] = (expenseCategories[categoryName] || 0) + value
        }
      })
    })

    // Deduction breakdown
    const deductionCategories: { [key: string]: number } = {}
    yearEntries.forEach((entry) => {
      Object.entries(entry.deductions).forEach(([key, value]) => {
        if (value && value > 0) {
          const categoryName = key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')
          deductionCategories[categoryName] = (deductionCategories[categoryName] || 0) + value
        }
      })
    })

    // Monthly data for chart
    const monthlyData = yearEntries
      .sort((a, b) => a.month_year.localeCompare(b.month_year))
      .map((entry) => {
        const monthDate = parseISO(entry.month_year + '-01')
        return {
          month: format(monthDate, 'MMM'),
          gross: entry.gross_income,
          disposable: entry.disposable_income,
          deductions: calculateTotalDeductions(entry.deductions),
          expenses: calculateTotalExpenses(entry.expenses),
        }
      })

    return {
      totalGross,
      totalDeductions,
      totalExpenses,
      totalDisposable,
      avgDisposable,
      avgGross,
      expenseCategories: Object.entries(expenseCategories)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      deductionCategories: Object.entries(deductionCategories)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      monthlyData,
      entryCount: yearEntries.length,
    }
  }, [yearEntries])

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    entries.forEach((entry) => {
      const year = parseISO(entry.month_year + '-01').getFullYear()
      years.add(year)
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [entries])

  const handleExportPDF = async () => {
    // This would call a backend endpoint to generate PDF
    // For now, we'll show a message
    setGeneratingPDF(true)
    setTimeout(() => {
      alert('Annual PDF export feature coming soon!')
      setGeneratingPDF(false)
    }, 1000)
  }

  if (loading) {
    return (
      <DashboardLayout title="Annual Summary" subtitle="View your yearly income and expense summary">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mb-4 inline-block h-8 w-8 animate-spin text-primary-600" />
            <p className="text-gray-600">Loading annual summary...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Annual Summary" subtitle={`Financial overview for ${selectedYear}`}>
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => navigate('/dashboard/income-tracker/history')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </button>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 focus:border-primary-500 focus:outline-none"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {summary && (
              <button
                onClick={handleExportPDF}
                disabled={generatingPDF}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 transition-colors"
              >
                {generatingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export PDF
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* No Data */}
        {!summary && (
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-12 text-center shadow-sm">
            <Calendar className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No data for {selectedYear}</h3>
            <p className="mb-6 text-gray-600">Start tracking your income to see annual summaries.</p>
            <button
              onClick={() => navigate('/dashboard/income-tracker')}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
            >
              Add Income Entry
            </button>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Total Gross Income</p>
                <p className="mt-2 text-3xl font-bold text-blue-700">{formatCurrency(summary.totalGross)}</p>
                <p className="mt-1 text-xs text-blue-600">Avg: {formatCurrency(summary.avgGross)}/month</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Total Deductions</p>
                <p className="mt-2 text-3xl font-bold text-red-700">{formatCurrency(summary.totalDeductions)}</p>
                <p className="mt-1 text-xs text-red-600">
                  {((summary.totalDeductions / summary.totalGross) * 100).toFixed(1)}% of gross
                </p>
              </div>
              <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Total Expenses</p>
                <p className="mt-2 text-3xl font-bold text-orange-700">{formatCurrency(summary.totalExpenses)}</p>
                <p className="mt-1 text-xs text-orange-600">
                  {((summary.totalExpenses / summary.totalGross) * 100).toFixed(1)}% of gross
                </p>
              </div>
              <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Total Disposable</p>
                <p className="mt-2 text-3xl font-bold text-primary-700">{formatCurrency(summary.totalDisposable)}</p>
                <p className="mt-1 text-xs text-primary-600">Avg: {formatCurrency(summary.avgDisposable)}/month</p>
              </div>
            </div>

            {/* Monthly Trend Chart */}
            {summary.monthlyData.length > 0 && (
              <div className="mb-6 rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-gray-900">Monthly Trend - {selectedYear}</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={summary.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="gross" fill="#3b82f6" name="Gross Income" />
                    <Bar dataKey="deductions" fill="#ef4444" name="Deductions" />
                    <Bar dataKey="expenses" fill="#f59e0b" name="Expenses" />
                    <Bar dataKey="disposable" fill="#10b981" name="Disposable" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Expense Categories */}
            {summary.expenseCategories.length > 0 && (
              <div className="mb-6 rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-gray-900">Expense Categories Breakdown</h3>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    {summary.expenseCategories.map((item, index) => {
                      const percentage = ((item.value / summary.totalExpenses) * 100).toFixed(1)
                      return (
                        <div key={item.name} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <div className="flex items-center gap-3">
                            <div className="h-4 w-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-sm font-medium text-gray-700">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.value)}</p>
                            <p className="text-xs text-gray-500">{percentage}%</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={summary.expenseCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {summary.expenseCategories.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Deduction Categories */}
            {summary.deductionCategories.length > 0 && (
              <div className="mb-6 rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-gray-900">Deduction Categories Breakdown</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {summary.deductionCategories.map((item) => {
                    const percentage = ((item.value / summary.totalDeductions) * 100).toFixed(1)
                    return (
                      <div key={item.name} className="rounded-lg border border-red-100 bg-red-50/30 p-4">
                        <p className="text-xs font-semibold text-red-600">{item.name}</p>
                        <p className="mt-1 text-xl font-bold text-red-700">{formatCurrency(item.value)}</p>
                        <p className="mt-1 text-xs text-red-600">{percentage}%</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Key Insights */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-blue-900">
                <TrendingUp className="h-5 w-5" />
                Key Insights for {selectedYear}
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>
                    <strong>{summary.entryCount} months</strong> of data tracked
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>
                    Average disposable income: <strong>{formatCurrency(summary.avgDisposable)}</strong> per month
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>
                    Total savings potential: <strong>{formatCurrency(summary.totalDisposable)}</strong> for the year
                  </span>
                </li>
                {summary.expenseCategories.length > 0 && (
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>
                      Largest expense category: <strong>{summary.expenseCategories[0].name}</strong> ({formatCurrency(summary.expenseCategories[0].value)})
                    </span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>
                    Disposable income ratio: <strong>{((summary.totalDisposable / summary.totalGross) * 100).toFixed(1)}%</strong> of gross income
                  </span>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

