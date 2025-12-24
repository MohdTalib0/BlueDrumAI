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
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  DollarSign,
  MessageSquare,
  Zap,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { format, parseISO } from 'date-fns'
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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

  useEffect(() => {
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

        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
        const response = await fetch(`${apiBase}/api/dashboard/stats`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats')
        }

        const data = await response.json()
        setStats(data.stats)
        lastFetchRef.current = Date.now()
      } catch (err: any) {
        console.error('Error fetching dashboard stats:', err)
        setError(err.message || 'Failed to load dashboard')
      } finally {
        setLoadingStats(false)
        fetchingRef.current = false
      }
    }

    fetchStats()
  }, [loading, user?.id, sessionToken]) // Only depend on user.id, not the whole user object

  // Calculate trend indicators
  const readinessTrend = useMemo(() => {
    if (!stats) return null
    // Simple calculation - in production, compare with previous period
    return stats.readinessScore >= 70 ? 'up' : stats.readinessScore >= 40 ? 'neutral' : 'down'
  }, [stats])

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-700 bg-red-50 border-red-200'
    if (score >= 60) return 'text-orange-700 bg-orange-50 border-orange-200'
    if (score >= 40) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    if (score >= 20) return 'text-blue-700 bg-blue-50 border-blue-200'
    return 'text-green-700 bg-green-50 border-green-200'
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
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout title="Dashboard" subtitle={`Welcome back, ${user.email}`}>
      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Vault Entries */}
        <div className="group rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm transition-all hover:bg-white/70 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vault Entries</p>
              {loadingStats ? (
                <div className="mt-2 flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                  <span className="text-3xl font-bold text-gray-900">-</span>
                </div>
              ) : (
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.vault.total || 0}</p>
              )}
              <p className="mt-1 text-xs text-gray-600">Evidence files stored</p>
            </div>
            <div className="rounded-lg bg-primary-50 p-3 text-primary-700 transition-transform group-hover:scale-110">
              <Shield className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Average Risk Score */}
        <div className="group rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm transition-all hover:bg-white/70 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Avg Risk Score</p>
              {loadingStats ? (
                <div className="mt-2 flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                  <span className="text-3xl font-bold text-gray-900">-</span>
                </div>
              ) : (
                <>
                  <p className={`mt-2 text-3xl font-bold ${stats?.chatAnalysis.avgRiskScore ? getRiskColor(stats.chatAnalysis.avgRiskScore).split(' ')[0] : 'text-gray-900'}`}>
                    {stats?.chatAnalysis.avgRiskScore || 0}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {stats?.chatAnalysis.avgRiskScore ? getRiskLabel(stats.chatAnalysis.avgRiskScore) : 'No analyses'} risk
                  </p>
                </>
              )}
            </div>
            <div className={`rounded-lg p-3 ${stats?.chatAnalysis.avgRiskScore ? getRiskColor(stats.chatAnalysis.avgRiskScore) : 'bg-amber-50 text-amber-700'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Chat Analyses */}
        <div className="group rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm transition-all hover:bg-white/70 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chat Analyses</p>
              {loadingStats ? (
                <div className="mt-2 flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                  <span className="text-3xl font-bold text-gray-900">-</span>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.chatAnalysis.total || 0}</p>
                  <p className="mt-1 text-xs text-gray-600">{stats?.chatAnalysis.totalRedFlags || 0} red flags detected</p>
                </>
              )}
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-blue-700 transition-transform group-hover:scale-110">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Readiness Score */}
        <div className="group rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm transition-all hover:bg-white/70 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Readiness Score</p>
              {loadingStats ? (
                <div className="mt-2 flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                  <span className="text-3xl font-bold text-gray-900">-</span>
                </div>
              ) : (
                <>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">{stats?.readinessScore || 0}</p>
                    <span className="text-lg text-gray-500">/ 100</span>
                    {readinessTrend && (
                      <span className={`flex items-center text-sm ${readinessTrend === 'up' ? 'text-green-600' : readinessTrend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                        {readinessTrend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : readinessTrend === 'down' ? <ArrowDownRight className="h-4 w-4" /> : null}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                      style={{ width: `${stats?.readinessScore || 0}%` }}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700 transition-transform group-hover:scale-110">
              <Zap className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      {stats && !loadingStats && (
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Income Trend Chart */}
          {stats.income.monthlyTrend.length > 0 && (
            <div className="rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Income Trend</h3>
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.income.monthlyTrend.map((d) => ({ ...d, month: format(parseISO(d.month + '-01'), 'MMM') }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="gross" stroke="#3b82f6" strokeWidth={2} name="Gross Income" />
                  <Line type="monotone" dataKey="disposable" stroke="#10b981" strokeWidth={2} name="Disposable Income" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Risk Score Distribution */}
          {stats.chatAnalysis.total > 0 && (
            <div className="rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Risk Score Distribution</h3>
                <BarChart3 className="h-5 w-5 text-red-600" />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    { range: '0-20', count: stats.chatAnalysis.recent.filter((a) => a.riskScore && a.riskScore < 20).length },
                    { range: '21-40', count: stats.chatAnalysis.recent.filter((a) => a.riskScore && a.riskScore >= 20 && a.riskScore < 40).length },
                    { range: '41-60', count: stats.chatAnalysis.recent.filter((a) => a.riskScore && a.riskScore >= 40 && a.riskScore < 60).length },
                    { range: '61-80', count: stats.chatAnalysis.recent.filter((a) => a.riskScore && a.riskScore >= 60 && a.riskScore < 80).length },
                    { range: '81-100', count: stats.chatAnalysis.recent.filter((a) => a.riskScore && a.riskScore >= 80).length },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="range" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Vault Entries by Type */}
          {stats.vault.total > 0 && Object.keys(stats.vault.byType).length > 0 && (
            <div className="rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Evidence by Type</h3>
                <PieChart className="h-5 w-5 text-primary-600" />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={Object.entries(stats.vault.byType).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(stats.vault.byType).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Platform Distribution */}
          {stats.chatAnalysis.total > 0 && Object.keys(stats.chatAnalysis.byPlatform).length > 0 && (
            <div className="rounded-lg border border-gray-200/20 bg-white/50 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Analyses by Platform</h3>
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={Object.entries(stats.chatAnalysis.byPlatform).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(stats.chatAnalysis.byPlatform).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => navigate('/dashboard/vault/upload')}
            className="group rounded-lg border border-gray-200/20 bg-white/50 p-5 text-left shadow-sm transition-all hover:bg-white/70 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-50 p-2 text-primary-700 transition-transform group-hover:scale-110">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Upload Evidence</h3>
                <p className="mt-1 text-sm text-gray-600">Add files to your consent vault</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/red-flag-radar')}
            className="group rounded-lg border border-gray-200/20 bg-white/50 p-5 text-left shadow-sm transition-all hover:bg-white/70 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2 text-red-700 transition-transform group-hover:scale-110">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Analyze Chat</h3>
                <p className="mt-1 text-sm text-gray-600">Detect red flags in conversations</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/income-tracker')}
            className="group rounded-lg border border-gray-200/20 bg-white/50 p-5 text-left shadow-sm transition-all hover:bg-white/70 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 transition-transform group-hover:scale-110">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Log Income</h3>
                <p className="mt-1 text-sm text-gray-600">Track monthly income & expenses</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/vault/timeline')}
            className="group rounded-lg border border-gray-200/20 bg-white/50 p-5 text-left shadow-sm transition-all hover:bg-white/70 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-700 transition-transform group-hover:scale-110">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">View Timeline</h3>
                <p className="mt-1 text-sm text-gray-600">See your evidence timeline</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/red-flag-radar/history')}
            className="group rounded-lg border border-gray-200/20 bg-white/50 p-5 text-left shadow-sm transition-all hover:bg-white/70 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2 text-purple-700 transition-transform group-hover:scale-110">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Analysis History</h3>
                <p className="mt-1 text-sm text-gray-600">Review past chat analyses</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/income-tracker/history')}
            className="group rounded-lg border border-gray-200/20 bg-white/50 p-5 text-left shadow-sm transition-all hover:bg-white/70 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-700 transition-transform group-hover:scale-110">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Income History</h3>
                <p className="mt-1 text-sm text-gray-600">View financial trends</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>

        {loadingStats ? (
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-12 text-center shadow-sm">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary-600" />
            <p className="text-gray-600">Loading activity...</p>
          </div>
        ) : stats && stats.recentActivity.length > 0 ? (
          <div className="space-y-3">
            {stats.recentActivity.map((activity, index) => (
              <div
                key={activity.id || index}
                className="group rounded-lg border border-gray-200/20 bg-white/50 p-4 shadow-sm transition-all hover:bg-white/70 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-lg bg-primary-50 p-2 text-primary-700">
                    {getActivityIcon(activity.module)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {activity.action === 'uploaded' && `Uploaded ${activity.type} evidence`}
                          {activity.action === 'analyzed' && `Analyzed chat (Risk: ${activity.riskScore})`}
                          {activity.action === 'logged' && `Logged income for ${format(parseISO(activity.month + '-01'), 'MMMM yyyy')}`}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">{activity.module}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                        </p>
                        {activity.riskScore && (
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${getRiskColor(activity.riskScore)}`}>
                            {getRiskLabel(activity.riskScore)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-12 text-center shadow-sm">
            <Activity className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No activity yet</h3>
            <p className="mb-6 text-gray-600">Start by uploading evidence, analyzing chats, or tracking your income.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => navigate('/dashboard/vault/upload')}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
              >
                Upload Evidence
              </button>
              <button
                onClick={() => navigate('/dashboard/red-flag-radar')}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
              >
                Analyze Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Key Insights */}
      {stats && !loadingStats && (stats.vault.total > 0 || stats.chatAnalysis.total > 0 || stats.income.totalEntries > 0) && (
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-blue-900">
            <Zap className="h-5 w-5" />
            Key Insights
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.chatAnalysis.highestRisk > 0 && (
              <div className="rounded-lg bg-white/80 p-4">
                <div className="flex items-center gap-2">
                  {stats.chatAnalysis.highestRisk >= 80 ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : stats.chatAnalysis.highestRisk >= 60 ? (
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <p className="text-sm font-semibold text-gray-900">Highest Risk Detected</p>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{stats.chatAnalysis.highestRisk}</p>
                <p className="text-xs text-gray-600">Monitor closely</p>
              </div>
            )}
            {stats.income.avgDisposable > 0 && (
              <div className="rounded-lg bg-white/80 p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-semibold text-gray-900">Avg Disposable Income</p>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  ₹{stats.income.avgDisposable.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-600">Per month</p>
              </div>
            )}
            {stats.vault.total > 0 && (
              <div className="rounded-lg bg-white/80 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary-600" />
                  <p className="text-sm font-semibold text-gray-900">Evidence Collected</p>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{stats.vault.total}</p>
                <p className="text-xs text-gray-600">Files in vault</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
