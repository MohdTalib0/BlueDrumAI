import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  FileText,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Clock,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  MessageSquare,
  Zap,
  Gift,
  ShieldAlert,
  FileHeart,
  Calculator,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getEdgeFunctionUrl, apiFetch } from '../lib/api'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { useDarkMode } from '../hooks/useDarkMode'
import { format, parseISO } from 'date-fns'
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface DashboardStats {
  vault: {
    total: number
    byType: Record<string, number>
    recent: Array<{ id: string; type: string; date: string; action: string; module: string }>
  }
  chatAnalysis: {
    total: number
    avgRiskScore: number
    highestRisk: number
    totalRedFlags: number
    byPlatform: Record<string, number>
    recent: Array<{ id: string; riskScore: number; date: string; action: string; module: string; platform?: string }>
  }
  income: {
    totalEntries: number
    totalGross: number
    totalDisposable: number
    avgDisposable: number
    monthlyTrend: Array<{ month: string; gross: number; disposable: number }>
    recent: Array<{ id: string; month: string; disposable: number; date: string; action: string; module: string }>
  }
  readinessScore: number
  recentActivity: Array<{
    id: string
    date?: string
    timestamp: string
    action: string
    module: string
    type?: string
    riskScore?: number
    platform?: string
    month?: string
    disposable?: number
  }>
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']

export default function Dashboard() {
  const { user, sessionToken, loading } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState('')
  const fetchingRef = useRef(false)
  const lastFetchRef = useRef<number>(0)

  const { dark } = useDarkMode()
  const gender = user?.gender ?? null
  const isMale = gender === 'male' || gender === 'both' || gender === null

  const tooltipStyle = {
    backgroundColor: dark ? '#000' : '#1f2937',
    color: '#fff',
    border: dark ? '1px solid #374151' : 'none',
    borderRadius: '8px',
    fontSize: 11,
    padding: '6px 10px',
  }
  const axisStroke = dark ? '#4b5563' : '#d1d5db'
  const cursorStyle = { fill: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }

  useEffect(() => {
    const controller = new AbortController()
    
    const fetchStats = async () => {
      // Prevent multiple simultaneous fetches
      if (fetchingRef.current) return
      
      // Prevent fetching too frequently (at least 5 seconds between fetches)
      const now = Date.now()
      if (now - lastFetchRef.current < 5000 && stats !== null) {
        return
      }

      if (loading || !user || !sessionToken) {
        setLoadingStats(false)
        return
      }

      try {
        fetchingRef.current = true
        setLoadingStats(true)
        setError('')

        const response = await apiFetch(
          `${getEdgeFunctionUrl('dashboard')}/stats`,
          sessionToken,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats')
        }

        const data = await response.json()
        setStats(data.stats)
        lastFetchRef.current = Date.now()
      } catch (err: any) {
        if (err.name === 'AbortError') return
        console.error('Error fetching dashboard stats:', err)
        setError(err.message || 'Failed to load dashboard')
      } finally {
        setLoadingStats(false)
        fetchingRef.current = false
      }
    }

    fetchStats()
    
    return () => {
      controller.abort()
    }
  }, [loading, user?.id, sessionToken]) // Only depend on user.id, not the whole user object

  // Calculate trend indicators
  const readinessTrend = useMemo(() => {
    if (!stats) return null
    // Simple calculation - in production, compare with previous period
    return stats.readinessScore >= 70 ? 'up' : stats.readinessScore >= 40 ? 'neutral' : 'down'
  }, [stats])

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-800'
    if (score >= 60) return 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-800'
    if (score >= 40) return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-800'
    if (score >= 20) return 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800'
    return 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800'
  }

  const getRiskLabel = (score: number) => {
    if (score >= 80) return 'Critical'
    if (score >= 60) return 'High'
    if (score >= 40) return 'Moderate'
    if (score >= 20) return 'Low'
    return 'Minimal'
  }

  const getActivityIcon = (module: string) => {
    switch (module) {
      case 'Consent Vault':
        return <Shield className="h-4 w-4" />
      case 'Red Flag Radar':
        return <AlertTriangle className="h-4 w-4" />
      case 'Income Tracker':
        return <TrendingUp className="h-4 w-4" />
      case 'Breakup Generator':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  const displayName = user?.first_name || user?.last_name
    ? [user.first_name, user.last_name].filter(Boolean).join(' ')
    : user?.email || 'User'

  return (
    <DashboardLayout title="Dashboard" subtitle={`Welcome back, ${displayName}`}>
      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-4 text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Quick Insights removed -- stat cards above serve this purpose */}

      {/* Main Stats Grid */}
      <div className="mb-6 sm:mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {loadingStats ? (
            <>
              {[0,1,2,3].map(i => (
                <div key={i} className="rounded-lg border border-gray-200/40 dark:border-primary-500/20 bg-gray-50 dark:bg-black p-3 sm:p-6 shadow-sm animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-7 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-2.5 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Vault Entries */}
              <div className="group rounded-lg border border-gray-200/40 dark:border-primary-500/20 bg-indigo-50 dark:bg-black p-3 sm:p-6 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Vault</p>
                    <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats?.vault.total || 0}</p>
                    <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Files stored</p>
                  </div>
                  <div className="rounded-lg bg-primary-50 dark:bg-gray-900 p-2 sm:p-3 text-primary-700 dark:text-primary-400 shrink-0">
                    <Shield className="h-4 w-4 sm:h-6 sm:w-6" />
                  </div>
                </div>
              </div>

              {/* Average Risk Score */}
              <div className="group rounded-lg border border-gray-200/40 dark:border-primary-500/20 bg-rose-50 dark:bg-black p-3 sm:p-6 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Avg Risk</p>
                    <p className={`mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold ${stats?.chatAnalysis.avgRiskScore ? getRiskColor(stats.chatAnalysis.avgRiskScore).split(' ')[0] : 'text-gray-900'}`}>
                      {stats?.chatAnalysis.avgRiskScore || 0}
                    </p>
                    <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                      {stats?.chatAnalysis.avgRiskScore ? getRiskLabel(stats.chatAnalysis.avgRiskScore) : 'No analyses'}
                    </p>
                  </div>
                  <div className={`rounded-lg p-2 sm:p-3 shrink-0 ${stats?.chatAnalysis.avgRiskScore ? getRiskColor(stats.chatAnalysis.avgRiskScore) : 'bg-amber-50 text-amber-700'}`}>
                    <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6" />
                  </div>
                </div>
              </div>

              {/* Chat Analyses */}
              <div className="group rounded-lg border border-gray-200/40 dark:border-primary-500/20 bg-amber-50 dark:bg-black p-3 sm:p-6 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Analyses</p>
                    <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats?.chatAnalysis.total || 0}</p>
                    <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">{stats?.chatAnalysis.totalRedFlags || 0} red flags</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-2 sm:p-3 text-blue-700 dark:text-blue-400 shrink-0">
                    <FileText className="h-4 w-4 sm:h-6 sm:w-6" />
                  </div>
                </div>
              </div>

              {/* Readiness Score */}
              <div className="group rounded-lg border border-gray-200/40 dark:border-primary-500/20 bg-emerald-50 dark:bg-black p-3 sm:p-6 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Readiness</p>
                    <div className="mt-1 sm:mt-2 flex items-baseline gap-1">
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats?.readinessScore || 0}</p>
                      <span className="text-sm text-gray-500 dark:text-gray-400">/ 100</span>
                      {readinessTrend && (
                        <span className={`flex items-center text-sm ${readinessTrend === 'up' ? 'text-green-600' : readinessTrend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                          {readinessTrend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : readinessTrend === 'down' ? <ArrowDownRight className="h-3 w-3" /> : null}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 sm:mt-2 h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                        style={{ width: `${stats?.readinessScore || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-2 sm:p-3 text-emerald-700 dark:text-emerald-400 shrink-0">
                    <Zap className="h-4 w-4 sm:h-6 sm:w-6" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

      {/* Getting Started — shown when user has no data */}
      {stats && !loadingStats && stats.vault.total === 0 && stats.chatAnalysis.total === 0 && (!isMale || stats.income.totalEntries === 0) && (
        <div className="mb-6 sm:mb-8 rounded-xl border border-blue-200/50 dark:border-primary-500/20 bg-gradient-to-br from-blue-50/80 via-white/60 to-yellow-50/30 dark:from-primary-900/20 dark:via-black/60 dark:to-black/30 p-5 sm:p-8 shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">Welcome to Blue Drum AI</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 sm:mb-6">Get started by completing these steps to build your case.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {[
              { step: '1', title: 'Upload Evidence', desc: 'Add documents, photos, or chat exports to your encrypted vault.', path: '/dashboard/vault/upload', icon: Shield, color: 'text-primary-600', bg: 'bg-primary-50' },
              { step: '2', title: 'Analyze a Chat', desc: 'Upload a conversation and let AI detect red flags and risks.', path: '/dashboard/red-flag-radar', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
              ...(isMale
                ? [{ step: '3', title: 'Log Your Income', desc: 'Track income and expenses for court-ready affidavits.', path: '/dashboard/income-tracker', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' }]
                : [{ step: '3', title: 'Document Incidents', desc: 'Log dowry or DV incidents with evidence attachments.', path: gender === 'female' ? '/dashboard/dv-log/add' : '/dashboard/dowry-vault/add', icon: ShieldAlert, color: 'text-purple-600', bg: 'bg-purple-50' }]
              ),
            ].map(({ step, title, desc, path, icon: Icon, color, bg }) => (
              <button
                key={step}
                onClick={() => navigate(path)}
                className="flex items-start gap-3 rounded-xl border border-gray-200/60 dark:border-primary-500/20 bg-white/80 dark:bg-black p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-primary-500/30 touch-manipulation"
              >
                <div className={`rounded-lg ${bg} dark:bg-gray-800 p-2 shrink-0`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Step {step}: {title}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      {stats && !loadingStats && (
        <div className="mb-6 sm:mb-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {/* Income Trend Chart — male only */}
          {isMale && stats.income.monthlyTrend.length > 0 && (
            <div className="rounded-lg border border-gray-200/20 dark:border-primary-500/20 bg-white/50 dark:bg-black p-3 sm:p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Income Trend</h3>
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
              </div>
              <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.income.monthlyTrend
                    .filter((d) => d.month && d.month.trim())
                    .map((d) => {
                      try {
                        let dateStr = d.month.trim()
                        if (dateStr.length === 7 && dateStr.match(/^\d{4}-\d{2}$/)) dateStr = `${dateStr}-01`
                        const parsedDate = parseISO(dateStr)
                        if (isNaN(parsedDate.getTime())) return { ...d, month: d.month.substring(0, 7) || d.month }
                        return { ...d, month: format(parsedDate, 'MMM') }
                      } catch {
                        return { ...d, month: d.month.substring(0, 7) || d.month }
                      }
                    })}
                  margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                >
                  <XAxis dataKey="month" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} cursor={{ stroke: dark ? '#374151' : '#d1d5db' }} />
                  <Line type="monotone" dataKey="gross" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Gross" />
                  <Line type="monotone" dataKey="disposable" stroke="#10b981" strokeWidth={2.5} dot={false} name="Disposable" />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Risk Score Distribution */}
          {stats.chatAnalysis.total > 0 && (
            <div className="rounded-lg border border-gray-200/20 dark:border-primary-500/20 bg-white/50 dark:bg-black p-3 sm:p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Risk Distribution</h3>
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
              </div>
              <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { range: '0-20', count: stats.chatAnalysis.recent.filter((a) => a.riskScore && a.riskScore < 20).length },
                    { range: '21-40', count: stats.chatAnalysis.recent.filter((a) => a.riskScore && a.riskScore >= 20 && a.riskScore < 40).length },
                    { range: '41-60', count: stats.chatAnalysis.recent.filter((a) => a.riskScore && a.riskScore >= 40 && a.riskScore < 60).length },
                    { range: '61-80', count: stats.chatAnalysis.recent.filter((a) => a.riskScore && a.riskScore >= 60 && a.riskScore < 80).length },
                    { range: '81+', count: stats.chatAnalysis.recent.filter((a) => a.riskScore && a.riskScore >= 80).length },
                  ]}
                  margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                  barCategoryGap="25%"
                >
                  <XAxis dataKey="range" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} cursor={cursorStyle} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Analyses" maxBarSize={40}>
                    {['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444'].map((color, i) => (
                      <Cell key={i} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Evidence by Type */}
          {stats.vault.total > 0 && Object.keys(stats.vault.byType).length > 0 && (
            <div className="rounded-lg border border-gray-200/20 dark:border-primary-500/20 bg-white/50 dark:bg-black p-3 sm:p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Evidence by Type</h3>
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-500" />
              </div>
              <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(stats.vault.byType).map(([name, value]) => ({ name, value }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                  barCategoryGap="25%"
                >
                  <XAxis dataKey="name" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} cursor={cursorStyle} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Files" maxBarSize={40}>
                    {Object.entries(stats.vault.byType).map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Analyses by Platform */}
          {stats.chatAnalysis.total > 0 && Object.keys(stats.chatAnalysis.byPlatform).length > 0 && (
            <div className="rounded-lg border border-gray-200/20 dark:border-primary-500/20 bg-white/50 dark:bg-black p-3 sm:p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">By Platform</h3>
                <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
              </div>
              <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(stats.chatAnalysis.byPlatform).map(([name, value]) => ({ name, value }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                  barCategoryGap="25%"
                >
                  <XAxis dataKey="name" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} cursor={cursorStyle} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Analyses" maxBarSize={40}>
                    {Object.entries(stats.chatAnalysis.byPlatform).map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions + Recent Activity — side by side */}
      <div className="mb-6 sm:mb-8 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5">
        {/* Quick Actions — left 3 cols */}
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {[
              { label: 'Upload Evidence', icon: Shield, color: 'text-primary-700', bg: 'bg-primary-600', bgLight: 'bg-primary-50', path: '/dashboard/vault/upload', primary: true, access: 'all' as const },
              { label: 'Analyze Chat', icon: AlertTriangle, color: 'text-red-700', bg: 'bg-white', bgLight: 'bg-white', path: '/dashboard/red-flag-radar', primary: false, access: 'all' as const },
              { label: 'Log Income', icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-white', bgLight: 'bg-white', path: '/dashboard/income-tracker', primary: false, access: 'male' as const },
              { label: 'Dowry Vault', icon: Gift, color: 'text-purple-700', bg: 'bg-white', bgLight: 'bg-purple-50', path: '/dashboard/dowry-vault', primary: false, access: 'female' as const },
              { label: 'Log Incident', icon: ShieldAlert, color: 'text-red-700', bg: 'bg-white', bgLight: 'bg-white', path: '/dashboard/dv-log/add', primary: false, access: 'female' as const },
              { label: 'View Timeline', icon: Clock, color: 'text-blue-700', bg: 'bg-white', bgLight: 'bg-white', path: '/dashboard/vault/timeline', primary: false, access: 'all' as const },
              { label: 'Analysis History', icon: FileText, color: 'text-purple-700', bg: 'bg-white', bgLight: 'bg-white', path: '/dashboard/red-flag-radar/history', primary: false, access: 'all' as const },
              { label: 'Income History', icon: BarChart3, color: 'text-amber-700', bg: 'bg-white', bgLight: 'bg-white', path: '/dashboard/income-tracker/history', primary: false, access: 'male' as const },
              { label: 'Medical Reports', icon: FileHeart, color: 'text-rose-700', bg: 'bg-white', bgLight: 'bg-white', path: '/dashboard/dv-log/medical', primary: false, access: 'female' as const },
              { label: 'Maintenance', icon: Calculator, color: 'text-teal-700', bg: 'bg-white', bgLight: 'bg-teal-50', path: '/dashboard/maintenance', primary: false, access: 'female' as const },
              { label: 'Breakup Generator', icon: MessageSquare, color: 'text-indigo-700', bg: 'bg-white', bgLight: 'bg-indigo-50', path: '/dashboard/breakup-generator', primary: false, access: 'male' as const },
            ].filter(item => {
              if (item.access === 'all') return true
              if (!gender || gender === 'both') return true
              return item.access === gender
            }).map(({ label, icon: Icon, color, bg, bgLight, path, primary }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`group flex items-center gap-2 rounded-lg border border-gray-200/60 dark:border-primary-500/20 ${primary ? `${bg} text-white hover:opacity-90` : `${bgLight} dark:bg-black text-gray-900 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900`} p-2.5 sm:p-3.5 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:hover:border-primary-500/30 touch-manipulation`}
              >
                <div className={`rounded-md ${primary ? 'bg-white/20' : `${bgLight} dark:bg-gray-800`} p-1.5 shrink-0`}>
                  <Icon className={`h-4 w-4 ${primary ? 'text-white' : color}`} />
                </div>
                <span className="text-xs sm:text-sm font-medium leading-tight">{label}</span>
              </button>
            ))}
          </div>

          {/* Key Insights — below Quick Actions */}
          {stats && !loadingStats && (stats.vault.total > 0 || stats.chatAnalysis.total > 0 || (isMale && stats.income.totalEntries > 0)) && (
            <div className="mt-4 rounded-lg border border-gray-200/40 dark:border-primary-500/20 bg-white/50 dark:bg-black p-3 sm:p-4 shadow-sm">
              <h3 className="mb-2 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Key Insights</h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {stats.chatAnalysis.highestRisk > 0 && (
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-2.5 sm:p-3">
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">Highest Risk:</p>
                    <p className="mt-0.5 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.chatAnalysis.highestRisk}</p>
                  </div>
                )}
                {stats.vault.total > 0 && (
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-2.5 sm:p-3">
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">Evidence:</p>
                    <p className="mt-0.5 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.vault.total}</p>
                  </div>
                )}
                {isMale && stats.income.avgDisposable > 0 && (
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-2.5 sm:p-3">
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">Avg Disposable:</p>
                    <p className="mt-0.5 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                      ₹{stats.income.avgDisposable.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity — right 2 cols */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          {loadingStats ? (
            <div className="rounded-lg border border-gray-200/40 dark:border-primary-500/20 bg-white/50 dark:bg-black p-6 text-center shadow-sm">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : stats && stats.recentActivity.length > 0 ? (
            <div className="rounded-lg border border-gray-200/40 dark:border-primary-500/20 bg-white/50 dark:bg-black shadow-sm divide-y divide-gray-100 dark:divide-primary-500/10">
              {stats.recentActivity.slice(0, 5).map((activity, index) => {
                const getModuleColor = (mod: string) => {
                  if (mod === 'Consent Vault') return 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  if (mod === 'Red Flag Radar') return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  if (mod === 'Income Tracker') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  if (mod === 'Breakup Generator') return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }
                const getBadgeColor = (mod: string) => {
                  if (mod === 'Consent Vault') return 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  if (mod === 'Red Flag Radar') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  if (mod === 'Income Tracker') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  if (mod === 'Breakup Generator') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }
                const getLabel = () => {
                  if (activity.action === 'uploaded') return 'Upload Evidence'
                  if (activity.action === 'analyzed') return 'Chat Analysis'
                  if (activity.action === 'logged') return 'Log Income'
                  if (activity.action === 'generated') return 'Breakup Message'
                  if (activity.action === 'checked') return 'Risk Check'
                  return activity.action
                }
                const getBadgeLabel = () => {
                  if (activity.riskScore != null) return getRiskLabel(activity.riskScore)
                  if (activity.action === 'uploaded') return 'vault'
                  if (activity.action === 'logged') return 'income'
                  if (activity.action === 'generated') return 'generated'
                  return 'done'
                }
                const getDate = () => {
                  try {
                    if (!activity.timestamp) return ''
                    const date = new Date(activity.timestamp)
                    if (isNaN(date.getTime())) return ''
                    return format(date, 'MMM d, yyyy, h:mm a')
                  } catch { return '' }
                }
                return (
                  <div key={activity.id || index} className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
                    <div className={`rounded-lg p-1.5 shrink-0 ${getModuleColor(activity.module)}`}>
                      {getActivityIcon(activity.module)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{getLabel()}</p>
                      <p className="text-[10px] sm:text-xs text-gray-400">{getDate()}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold shrink-0 ${getBadgeColor(activity.module)}`}>
                      {getBadgeLabel()}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200/40 dark:border-primary-500/20 bg-white/50 dark:bg-black p-6 text-center shadow-sm">
              <Activity className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-xs text-gray-500 dark:text-gray-400">No activity yet</p>
              <button
                onClick={() => navigate('/dashboard/vault/upload')}
                className="mt-3 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>

    </DashboardLayout>
  )
}
