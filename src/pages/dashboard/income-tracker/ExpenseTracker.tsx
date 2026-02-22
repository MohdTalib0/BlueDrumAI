import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, TrendingUp, Plus, Edit2, Trash2, Loader2, FileText, Download, BarChart3, TrendingDown, ChevronDown, ChevronUp, Search, Filter, X, LineChart, Calendar as CalendarIcon } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { format, parseISO, startOfYear, endOfYear, isWithinInterval, subMonths } from 'date-fns'
import { LineChart as RechartsLineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

import toast from 'react-hot-toast'
import { getEdgeFunctionUrl, apiFetch } from '../../../lib/api'
import ConfirmModal from '../../../components/ui/ConfirmModal'

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showInsights, setShowInsights] = useState(true)
  const [showCharts, setShowCharts] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    const controller = new AbortController()
    loadHistory(controller.signal)
    
    return () => {
      controller.abort()
    }
  }, [])

  const loadHistory = async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      setError('')
      if (!sessionToken) {
        throw new Error('Not authenticated')
      }

      const response = await apiFetch(`${getEdgeFunctionUrl('income')}/history`, sessionToken!, {
        signal,
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
      if (err.name === 'AbortError') return
      console.error('Error loading income history:', err)
      setError(err.message || 'Failed to load income history')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null)
    const savedEntries = entries
    try {
      setDeletingId(id)
      setEntries(entries.filter((entry) => entry.id !== id))

      if (!sessionToken) {
        throw new Error('Not authenticated')
      }

      const response = await apiFetch(`${getEdgeFunctionUrl('income')}/entry/${id}`, sessionToken!, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete entry')
      }
    } catch (err: any) {
      setEntries(savedEntries)
      toast.error(err.message || 'Failed to delete entry')
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
      <DashboardLayout title="Income History" subtitle="View your income and expense history" backHref="/dashboard/income-tracker">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mb-4 inline-block h-8 w-8 animate-spin text-primary-600" />
            <p className="text-gray-600 dark:text-gray-400">Loading income history...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Income History" subtitle={`${filteredEntries.length} of ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`} backHref="/dashboard/income-tracker">
      <div className="w-full min-w-0 overflow-x-hidden">
        {/* Header Actions */}
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-end gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {filteredEntries.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-black px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors min-h-[44px] touch-manipulation"
              >
                <Download className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard/income-tracker')}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors min-h-[44px] touch-manipulation"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add Entry
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/dashboard/income-tracker/annual')}
            className="group flex items-center gap-3 rounded-xl border border-blue-200 dark:border-blue-700/30 bg-gradient-to-br from-blue-50 to-white dark:from-black dark:to-black p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left touch-manipulation"
          >
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 group-hover:bg-blue-200 transition-colors">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 transition-colors">Annual Summary</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">Yearly income overview</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/dashboard/income-tracker/affidavit')}
            className="group flex items-center gap-3 rounded-xl border border-purple-200 dark:border-purple-700/30 bg-gradient-to-br from-purple-50 to-white dark:from-black dark:to-black p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-purple-300 transition-all text-left touch-manipulation"
          >
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 group-hover:bg-purple-200 transition-colors">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-purple-700 transition-colors">Generate Affidavit</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">Legal income declaration</p>
            </div>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-4 sm:mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by month or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-black pl-9 sm:pl-10 pr-10 py-2.5 sm:py-2 text-sm dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none min-h-[44px] sm:min-h-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors min-h-[44px] touch-manipulation ${
                filterPeriod !== 'all' || showFilters
                  ? 'border-primary-500 bg-primary-50 dark:bg-black text-primary-700'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black p-3 sm:p-4 animate-in slide-in-from-top-2">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Period:</span>
                {(['all', '3months', '6months', '12months'] as FilterPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setFilterPeriod(period)
                      if (period !== 'year') setShowFilters(false)
                    }}
                    className={`rounded-lg border px-3 py-2 sm:py-1.5 text-xs font-semibold transition-colors min-h-[40px] sm:min-h-0 touch-manipulation ${
                      filterPeriod === period
                        ? 'border-primary-500 bg-primary-50 dark:bg-black text-primary-700'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
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
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Year:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(Number(e.target.value))
                        setFilterPeriod('year')
                      }}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-black px-3 py-1.5 text-xs font-semibold dark:text-gray-100 focus:border-primary-500 focus:outline-none"
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
                      className={`rounded-lg border px-3 py-2 sm:py-1.5 text-xs font-semibold transition-colors min-h-[40px] sm:min-h-0 touch-manipulation ${
                        filterPeriod === 'year'
                          ? 'border-primary-500 bg-primary-50 dark:bg-black text-primary-700'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      <span className="hidden sm:inline">Apply Year Filter</span>
                      <span className="sm:hidden">Year</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Insights Panel */}
        {insights && filteredEntries.length > 0 && (
          <div className="mb-4 sm:mb-6 rounded-lg border border-gray-200/20 dark:border-gray-700 bg-white/50 dark:bg-black p-4 sm:p-6 shadow-sm">
            <button
              onClick={() => setShowInsights(!showInsights)}
              className="flex w-full items-center justify-between py-1 min-h-[44px] touch-manipulation"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary-600 shrink-0" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Financial Insights</h3>
              </div>
              {showInsights ? <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />}
            </button>
            {showInsights && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 animate-in slide-in-from-top-2">
                <div className="rounded-lg border border-primary-200 dark:border-primary-700/30 bg-primary-50/50 dark:bg-black p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-primary-600">Avg Disposable</p>
                  <p className="mt-1 text-lg sm:text-2xl font-bold text-primary-700 truncate">{formatCurrency(insights.avgDisposable)}</p>
                </div>
                <div className="rounded-lg border border-blue-200 dark:border-blue-700/30 bg-blue-50/50 dark:bg-black p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-blue-600">Avg Gross</p>
                  <p className="mt-1 text-lg sm:text-2xl font-bold text-blue-700 truncate">{formatCurrency(insights.avgGross)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-black p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Entries</p>
                  <p className="mt-1 text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{insights.totalEntries}</p>
                </div>
                <div
                  className={`rounded-lg border p-3 sm:p-4 col-span-2 lg:col-span-1 ${
                    insights.trend === 'up'
                      ? 'border-green-200 dark:border-green-700/30 bg-green-50/50 dark:bg-black'
                      : insights.trend === 'down'
                      ? 'border-red-200 dark:border-red-700/30 bg-red-50/50 dark:bg-black'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-black'
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Trend</p>
                  </div>
                  <p
                    className={`mt-1 text-lg sm:text-2xl font-bold ${
                      insights.trend === 'up' ? 'text-green-700' : insights.trend === 'down' ? 'text-red-700' : 'text-gray-900 dark:text-white'
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
          <div className="mb-4 sm:mb-6 space-y-4 sm:space-y-6">
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200/20 dark:border-gray-700 bg-white/50 dark:bg-black p-3 sm:p-4 shadow-sm hover:bg-white/70 dark:hover:bg-gray-900 transition-colors min-h-[44px] touch-manipulation"
            >
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary-600 shrink-0" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Visual Analytics</h3>
              </div>
              {showCharts ? <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />}
            </button>

            {showCharts && (
              <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-top-2 overflow-x-hidden">
                {/* Income Trend Chart */}
                {chartData.length > 0 && (
                  <div className="rounded-lg border border-gray-200/20 dark:border-gray-700 bg-white/50 dark:bg-black p-3 sm:p-6 shadow-sm overflow-x-auto">
                    <h4 className="mb-3 sm:mb-4 text-sm font-semibold text-gray-900 dark:text-white">Income Trend</h4>
                    <div className="min-w-[280px]" style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
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
                  </div>
                )}

                {/* Monthly Comparison Chart */}
                {chartData.length > 0 && (
                  <div className="rounded-lg border border-gray-200/20 dark:border-gray-700 bg-white/50 dark:bg-black p-3 sm:p-6 shadow-sm overflow-x-auto">
                    <h4 className="mb-3 sm:mb-4 text-sm font-semibold text-gray-900 dark:text-white">Monthly Breakdown</h4>
                    <div className="min-w-[280px]" style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
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
                  </div>
                )}

                {/* Expense Category Breakdown */}
                {expenseCategoryData.length > 0 && (
                  <div className="rounded-lg border border-gray-200/20 dark:border-gray-700 bg-white/50 dark:bg-black p-3 sm:p-6 shadow-sm overflow-x-auto">
                    <h4 className="mb-3 sm:mb-4 text-sm font-semibold text-gray-900 dark:text-white">Expense Categories</h4>
                    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 min-w-[260px]">
                      <div className="h-[220px] sm:h-[250px] w-full min-w-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
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
                      </div>
                      <div className="flex flex-col justify-center space-y-2 mt-3 sm:mt-0 min-w-0">
                        {expenseCategoryData.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-4 w-4 shrink-0 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">{formatCurrency(item.value)}</span>
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
          <div className="mb-6 rounded-lg border border-red-200 dark:border-red-700/40 bg-red-50 dark:bg-black p-4 text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Empty State */}
        {filteredEntries.length === 0 && !loading && (
          <div className="rounded-lg border border-gray-200/20 dark:border-gray-700 bg-white/50 dark:bg-black p-6 sm:p-12 text-center shadow-sm">
            <TrendingUp className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              {entries.length === 0 ? 'No income records yet' : 'No entries match your filters'}
            </h3>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              {entries.length === 0
                ? 'Start tracking your income and expenses to see your financial history and insights.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {entries.length === 0 ? (
              <button
                onClick={() => navigate('/dashboard/income-tracker')}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors min-h-[44px] touch-manipulation"
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
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-black px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 min-h-[44px] touch-manipulation"
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
                <div key={entry.id} className="rounded-lg border border-gray-200/20 dark:border-gray-700 bg-white/50 dark:bg-black hover:bg-white/70 dark:hover:bg-gray-900 transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Month Header */}
                        <div className="mb-3 sm:mb-4 flex items-center gap-3">
                          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 shadow-sm">
                            <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                              {monthDate ? format(monthDate, 'MMMM yyyy') : entry.month_year || 'Unknown'}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Updated {updatedAtDate ? format(updatedAtDate, 'MMM d, yyyy') : 'Unknown'}
                            </p>
                          </div>
                        </div>

                        {/* Income Breakdown - Compact View */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
                          <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Gross</p>
                            <p className="mt-0.5 text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">{formatCurrency(entry.gross_income)}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Deductions</p>
                            <p className="mt-0.5 text-base sm:text-xl font-bold text-red-600 truncate">-{formatCurrency(totalDeductions)}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Expenses</p>
                            <p className="mt-0.5 text-base sm:text-xl font-bold text-orange-600 truncate">-{formatCurrency(totalExpenses)}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-primary-600">Disposable</p>
                            <p className="mt-0.5 text-base sm:text-xl font-bold text-primary-700 truncate">{formatCurrency(entry.disposable_income)}</p>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-4 sm:mt-6 space-y-4 animate-in slide-in-from-top-2">
                            {/* Deductions Breakdown */}
                            {totalDeductions > 0 && (
                              <div className="rounded-lg border border-red-100 dark:border-red-700/30 bg-red-50/30 dark:bg-black p-3 sm:p-4">
                                <p className="mb-2 sm:mb-3 text-xs font-semibold uppercase tracking-wide text-red-600">Deductions Breakdown</p>
                                <div className="flex flex-wrap gap-2">
                                  {entry.deductions.income_tax && (
                                    <span className="rounded-lg bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm">
                                      Income Tax: {formatCurrency(entry.deductions.income_tax)}
                                    </span>
                                  )}
                                  {entry.deductions.pf && (
                                    <span className="rounded-lg bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm">
                                      PF: {formatCurrency(entry.deductions.pf)}
                                    </span>
                                  )}
                                  {entry.deductions.professional_tax && (
                                    <span className="rounded-lg bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm">
                                      Prof. Tax: {formatCurrency(entry.deductions.professional_tax)}
                                    </span>
                                  )}
                                  {entry.deductions.other && (
                                    <span className="rounded-lg bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm">
                                      Other: {formatCurrency(entry.deductions.other)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Expenses Breakdown */}
                            {totalExpenses > 0 && (
                              <div className="rounded-lg border border-orange-100 dark:border-orange-700/30 bg-orange-50/30 dark:bg-black p-3 sm:p-4">
                                <p className="mb-2 sm:mb-3 text-xs font-semibold uppercase tracking-wide text-orange-600">Expenses Breakdown</p>
                                <div className="flex flex-wrap gap-2">
                                  {entry.expenses.emi && (
                                    <span className="rounded-lg bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm">
                                      EMI: {formatCurrency(entry.expenses.emi)}
                                    </span>
                                  )}
                                  {entry.expenses.medical && (
                                    <span className="rounded-lg bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm">
                                      Medical: {formatCurrency(entry.expenses.medical)}
                                    </span>
                                  )}
                                  {entry.expenses.parents && (
                                    <span className="rounded-lg bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm">
                                      Parents: {formatCurrency(entry.expenses.parents)}
                                    </span>
                                  )}
                                  {entry.expenses.rent && (
                                    <span className="rounded-lg bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm">
                                      Rent: {formatCurrency(entry.expenses.rent)}
                                    </span>
                                  )}
                                  {entry.expenses.utilities && (
                                    <span className="rounded-lg bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm">
                                      Utilities: {formatCurrency(entry.expenses.utilities)}
                                    </span>
                                  )}
                                  {entry.expenses.other && (
                                    <span className="rounded-lg bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm">
                                      Other: {formatCurrency(entry.expenses.other)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {entry.notes && (
                              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black p-3 sm:p-4">
                                <p className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">Notes</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{entry.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row sm:flex-col gap-2 shrink-0 sm:ml-4">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          className="flex-1 sm:flex-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-black p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors min-h-[44px] touch-manipulation flex items-center justify-center"
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => navigate(`/dashboard/income-tracker/edit/${entry.id}`)}
                          className="flex-1 sm:flex-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-black p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors min-h-[44px] touch-manipulation flex items-center justify-center"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(entry.id)}
                          disabled={deletingId === entry.id}
                          className="flex-1 sm:flex-none rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-black p-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors min-h-[44px] touch-manipulation flex items-center justify-center"
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
      <ConfirmModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Delete this entry?"
        message="This income entry will be permanently removed. This action cannot be undone."
      />
    </DashboardLayout>
  )
}
