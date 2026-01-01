import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, TrendingUp, ArrowLeft, Plus, Edit2, Trash2, Loader2, FileText, Download, BarChart3, TrendingDown, ChevronDown, ChevronUp, Search, Filter, X, LineChart, Calendar as CalendarIcon } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { format, parseISO, startOfYear, endOfYear, isWithinInterval, subMonths } from 'date-fns'
import { LineChart as RechartsLineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

import { getEdgeFunctionUrl } from '../../../lib/api'

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
  created_at: string
  updated_at: string
}

type FilterPeriod = 'all' | '3months' | '6months' | '12months' | 'year' | 'custom'

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']

// Safely parse month_year which can be "YYYY-MM" or "YYYY-MM-DD"
const parseMonthYear = (monthYear?: string) => {
  if (!monthYear || typeof monthYear !== 'string') return null
  let dateStr = monthYear.trim()
  if (!dateStr) return null
  if (dateStr.length === 7 && /^\d{4}-\d{2}$/.test(dateStr)) {
    dateStr = `${dateStr}-01`
  }
  const parsed = parseISO(dateStr)
  if (isNaN(parsed.getTime())) return null
  return parsed
}

// Safely parse generic ISO date strings (e.g., created_at / updated_at)
const parseDateSafe = (value?: string) => {
  if (!value || typeof value !== 'string') return null
  const parsed = parseISO(value)
  return isNaN(parsed.getTime()) ? null : parsed
}

export default function ExpenseTracker() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<IncomeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showInsights, setShowInsights] = useState(true)
  const [showCharts, setShowCharts] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

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

      const response = await fetch(`${getEdgeFunctionUrl('income')}/history`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'Failed to load income history'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`
          }
        } catch {
          // If response isn't JSON, use status text
          errorMessage = `Failed to load income history (${response.status}: ${response.statusText})`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // Handle both success and error responses
      if (data.success === false) {
        throw new Error(data.error || 'Failed to load income history')
      }
      
      setEntries(data.entries || [])
    } catch (err: any) {
      console.error('Error loading income history:', err)
      setError(err.message || 'Failed to load income history')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingId(id)
      if (!sessionToken) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${getEdgeFunctionUrl('income')}/entry/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete entry')
      }

      setEntries(entries.filter((entry) => entry.id !== id))
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry')
    } finally {
      setDeletingId(null)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Month', 'Gross Income', 'Total Deductions', 'Total Expenses', 'Disposable Income']
    const rows = filteredEntries.map((entry) => {
      const monthDate = parseMonthYear(entry.month_year)
      const totalDeductions = calculateTotalDeductions(entry.deductions)
      const totalExpenses = calculateTotalExpenses(entry.expenses)
      return [
        monthDate ? format(monthDate, 'MMMM yyyy') : entry.month_year || 'Unknown',
        entry.gross_income.toString(),
        totalDeductions.toString(),
        totalExpenses.toString(),
        entry.disposable_income.toString(),
      ]
    })

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `income-tracker-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
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

  // Filter entries based on search and period
  const filteredEntries = useMemo(() => {
    let filtered = [...entries]

    // Apply period filter
    if (filterPeriod !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (filterPeriod) {
        case '3months':
          startDate = subMonths(now, 3)
          break
        case '6months':
          startDate = subMonths(now, 6)
          break
        case '12months':
          startDate = subMonths(now, 12)
          break
        case 'year':
          startDate = startOfYear(new Date(selectedYear, 0, 1))
          const endDate = endOfYear(new Date(selectedYear, 0, 1))
          filtered = filtered.filter((entry) => {
            const entryDate = parseMonthYear(entry.month_year)
            return entryDate ? isWithinInterval(entryDate, { start: startDate, end: endDate }) : false
          })
          break
        default:
          startDate = new Date(0)
      }

      if (filterPeriod !== 'year') {
        filtered = filtered.filter((entry) => {
          const entryDate = parseMonthYear(entry.month_year)
          return entryDate ? entryDate >= startDate : false
        })
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((entry) => {
        const monthDate = parseMonthYear(entry.month_year)
        const monthName = monthDate ? format(monthDate, 'MMMM yyyy').toLowerCase() : (entry.month_year || '').toLowerCase()
        const notes = (entry.notes || '').toLowerCase()
        return monthName.includes(query) || notes.includes(query)
      })
    }

    return filtered.sort((a, b) => b.month_year.localeCompare(a.month_year))
  }, [entries, filterPeriod, searchQuery, selectedYear])

  // Chart data preparation
  const chartData = useMemo(() => {
    return filteredEntries
      .slice()
      .reverse()
      .map((entry) => {
        const monthDate = parseMonthYear(entry.month_year)
        return {
          month: monthDate ? format(monthDate, 'MMM yyyy') : entry.month_year || 'Unknown',
          gross: entry.gross_income,
          disposable: entry.disposable_income,
          deductions: calculateTotalDeductions(entry.deductions),
          expenses: calculateTotalExpenses(entry.expenses),
        }
      })
  }, [filteredEntries])

  // Expense category breakdown
  const expenseCategoryData = useMemo(() => {
    const categories: { [key: string]: number } = {}
    filteredEntries.forEach((entry) => {
      Object.entries(entry.expenses).forEach(([key, value]) => {
        if (value && value > 0) {
          const categoryName = key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')
          categories[categoryName] = (categories[categoryName] || 0) + value
        }
      })
    })
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredEntries])

  // Calculate insights
  const insights = useMemo(() => {
    if (filteredEntries.length === 0) return null

    const avgDisposable = filteredEntries.reduce((sum, e) => sum + e.disposable_income, 0) / filteredEntries.length
    const avgGross = filteredEntries.reduce((sum, e) => sum + e.gross_income, 0) / filteredEntries.length
    const totalDeductions = filteredEntries.reduce((sum, e) => sum + calculateTotalDeductions(e.deductions), 0)
    const totalExpenses = filteredEntries.reduce((sum, e) => sum + calculateTotalExpenses(e.expenses), 0)

    // Find trends
    const sortedEntries = [...filteredEntries].sort((a, b) => a.month_year.localeCompare(b.month_year))
    const recentEntries = sortedEntries.slice(-3)
    const olderEntries = sortedEntries.slice(-6, -3)

    const recentAvg = recentEntries.length > 0 ? recentEntries.reduce((sum, e) => sum + e.disposable_income, 0) / recentEntries.length : 0
    const olderAvg = olderEntries.length > 0 ? olderEntries.reduce((sum, e) => sum + e.disposable_income, 0) / olderEntries.length : 0

    const trend = recentAvg > olderAvg ? 'up' : recentAvg < olderAvg ? 'down' : 'stable'
    const trendPercent = olderAvg > 0 ? Math.abs(((recentAvg - olderAvg) / olderAvg) * 100) : 0

    return {
      avgDisposable,
      avgGross,
      totalDeductions,
      totalExpenses,
      trend,
      trendPercent,
      totalEntries: filteredEntries.length,
    }
  }, [filteredEntries])

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    entries.forEach((entry) => {
      const parsed = parseMonthYear(entry.month_year)
      if (parsed) {
        years.add(parsed.getFullYear())
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [entries])

  if (loading) {
    return (
      <DashboardLayout title="Income History" subtitle="View your income and expense history">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mb-4 inline-block h-8 w-8 animate-spin text-primary-600" />
            <p className="text-gray-600">Loading income history...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Income History" subtitle={`${filteredEntries.length} of ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}>
      <div className="w-full">
        {/* Header Actions */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => navigate('/dashboard/income-tracker')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            {filteredEntries.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard/income-tracker/annual')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <CalendarIcon className="h-4 w-4" />
              Annual Summary
            </button>
            <button
              onClick={() => navigate('/dashboard/income-tracker/affidavit')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Generate Affidavit
            </button>
            <button
              onClick={() => navigate('/dashboard/income-tracker')}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Entry
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by month or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-10 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                filterPeriod !== 'all' || showFilters
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 animate-in slide-in-from-top-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">Period:</span>
                {(['all', '3months', '6months', '12months'] as FilterPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setFilterPeriod(period)
                      if (period !== 'year') setShowFilters(false)
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      filterPeriod === period
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {period === 'all'
                      ? 'All Time'
                      : period === '3months'
                      ? 'Last 3 Months'
                      : period === '6months'
                      ? 'Last 6 Months'
                      : 'Last 12 Months'}
                  </button>
                ))}
                {availableYears.length > 0 && (
                  <>
                    <span className="text-sm font-semibold text-gray-700">Year:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(Number(e.target.value))
                        setFilterPeriod('year')
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-primary-500 focus:outline-none"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        setFilterPeriod('year')
                        setShowFilters(false)
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        filterPeriod === 'year'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Apply Year Filter
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Insights Panel */}
        {insights && filteredEntries.length > 0 && (
          <div className="mb-6 rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
            <button
              onClick={() => setShowInsights(!showInsights)}
              className="flex w-full items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary-600" />
                <h3 className="text-base font-semibold text-gray-900">Financial Insights</h3>
              </div>
              {showInsights ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </button>
            {showInsights && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in slide-in-from-top-2">
                <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Avg Disposable</p>
                  <p className="mt-1 text-2xl font-bold text-primary-700">{formatCurrency(insights.avgDisposable)}</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Avg Gross Income</p>
                  <p className="mt-1 text-2xl font-bold text-blue-700">{formatCurrency(insights.avgGross)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Total Entries</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{insights.totalEntries}</p>
                </div>
                <div
                  className={`rounded-lg border p-4 ${
                    insights.trend === 'up'
                      ? 'border-green-200 bg-green-50/50'
                      : insights.trend === 'down'
                      ? 'border-red-200 bg-red-50/50'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {insights.trend === 'up' ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : insights.trend === 'down' ? (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    ) : (
                      <BarChart3 className="h-5 w-5 text-gray-600" />
                    )}
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Trend</p>
                  </div>
                  <p
                    className={`mt-1 text-2xl font-bold ${
                      insights.trend === 'up' ? 'text-green-700' : insights.trend === 'down' ? 'text-red-700' : 'text-gray-900'
                    }`}
                  >
                    {insights.trend === 'up' ? '↑' : insights.trend === 'down' ? '↓' : '→'} {insights.trendPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Charts Section */}
        {filteredEntries.length > 0 && (
          <div className="mb-6 space-y-6">
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200/20 bg-white/50 p-4 shadow-sm hover:bg-white/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary-600" />
                <h3 className="text-base font-semibold text-gray-900">Visual Analytics</h3>
              </div>
              {showCharts ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </button>

            {showCharts && (
              <div className="space-y-6 animate-in slide-in-from-top-2">
                {/* Income Trend Chart */}
                {chartData.length > 0 && (
                  <div className="rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
                    <h4 className="mb-4 text-sm font-semibold text-gray-900">Income Trend</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsLineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="gross" stroke="#3b82f6" strokeWidth={2} name="Gross Income" dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="disposable" stroke="#10b981" strokeWidth={2} name="Disposable Income" dot={{ r: 4 }} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Monthly Comparison Chart */}
                {chartData.length > 0 && (
                  <div className="rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
                    <h4 className="mb-4 text-sm font-semibold text-gray-900">Monthly Breakdown</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
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

                {/* Expense Category Breakdown */}
                {expenseCategoryData.length > 0 && (
                  <div className="rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
                    <h4 className="mb-4 text-sm font-semibold text-gray-900">Expense Categories</h4>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <ResponsiveContainer width="100%" height={250}>
                        <RechartsPieChart>
                          <Pie
                            data={expenseCategoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {expenseCategoryData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col justify-center space-y-2">
                        {expenseCategoryData.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              <span className="text-sm text-gray-700">{item.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Empty State */}
        {filteredEntries.length === 0 && !loading && (
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-12 text-center shadow-sm">
            <TrendingUp className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              {entries.length === 0 ? 'No income records yet' : 'No entries match your filters'}
            </h3>
            <p className="mb-6 text-gray-600">
              {entries.length === 0
                ? 'Start tracking your income and expenses to see your financial history and insights.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {entries.length === 0 ? (
              <button
                onClick={() => navigate('/dashboard/income-tracker')}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add First Entry
              </button>
            ) : (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterPeriod('all')
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Income Entries List */}
        {filteredEntries.length > 0 && (
          <div className="space-y-4">
            {filteredEntries.map((entry) => {
              const totalDeductions = calculateTotalDeductions(entry.deductions)
              const totalExpenses = calculateTotalExpenses(entry.expenses)
              const monthDate = parseMonthYear(entry.month_year)
              const updatedAtDate = parseDateSafe(entry.updated_at)
              const isExpanded = expandedId === entry.id

              return (
                <div key={entry.id} className="rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-all duration-200 shadow-sm hover:shadow-md">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Month Header */}
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 shadow-sm">
                            <Calendar className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {monthDate ? format(monthDate, 'MMMM yyyy') : entry.month_year || 'Unknown'}
                            </h3>
                            <p className="text-xs text-gray-500">
                              Updated {updatedAtDate ? format(updatedAtDate, 'MMM d, yyyy') : 'Unknown'}
                            </p>
                          </div>
                        </div>

                        {/* Income Breakdown - Compact View */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Gross Income</p>
                            <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(entry.gross_income)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Deductions</p>
                            <p className="mt-1 text-xl font-bold text-red-600">-{formatCurrency(totalDeductions)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expenses</p>
                            <p className="mt-1 text-xl font-bold text-orange-600">-{formatCurrency(totalExpenses)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Disposable</p>
                            <p className="mt-1 text-xl font-bold text-primary-700">{formatCurrency(entry.disposable_income)}</p>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-6 space-y-4 animate-in slide-in-from-top-2">
                            {/* Deductions Breakdown */}
                            {totalDeductions > 0 && (
                              <div className="rounded-lg border border-red-100 bg-red-50/30 p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-red-600">Deductions Breakdown</p>
                                <div className="flex flex-wrap gap-2">
                                  {entry.deductions.income_tax && (
                                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm">
                                      Income Tax: {formatCurrency(entry.deductions.income_tax)}
                                    </span>
                                  )}
                                  {entry.deductions.pf && (
                                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm">
                                      PF: {formatCurrency(entry.deductions.pf)}
                                    </span>
                                  )}
                                  {entry.deductions.professional_tax && (
                                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm">
                                      Prof. Tax: {formatCurrency(entry.deductions.professional_tax)}
                                    </span>
                                  )}
                                  {entry.deductions.other && (
                                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm">
                                      Other: {formatCurrency(entry.deductions.other)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Expenses Breakdown */}
                            {totalExpenses > 0 && (
                              <div className="rounded-lg border border-orange-100 bg-orange-50/30 p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orange-600">Expenses Breakdown</p>
                                <div className="flex flex-wrap gap-2">
                                  {entry.expenses.emi && (
                                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm">
                                      EMI: {formatCurrency(entry.expenses.emi)}
                                    </span>
                                  )}
                                  {entry.expenses.medical && (
                                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm">
                                      Medical: {formatCurrency(entry.expenses.medical)}
                                    </span>
                                  )}
                                  {entry.expenses.parents && (
                                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm">
                                      Parents: {formatCurrency(entry.expenses.parents)}
                                    </span>
                                  )}
                                  {entry.expenses.rent && (
                                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm">
                                      Rent: {formatCurrency(entry.expenses.rent)}
                                    </span>
                                  )}
                                  {entry.expenses.utilities && (
                                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm">
                                      Utilities: {formatCurrency(entry.expenses.utilities)}
                                    </span>
                                  )}
                                  {entry.expenses.other && (
                                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm">
                                      Other: {formatCurrency(entry.expenses.other)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {entry.notes && (
                              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <p className="mb-1 text-xs font-semibold text-gray-700">Notes</p>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{entry.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="ml-4 flex flex-col gap-2">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 transition-colors"
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => navigate(`/dashboard/income-tracker/edit/${entry.id}`)}
                          className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          className="rounded-lg border border-red-300 bg-white p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                          title="Delete"
                        >
                          {deletingId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
