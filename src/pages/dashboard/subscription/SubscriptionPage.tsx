import { useState, useEffect } from 'react'
import {
  Crown, Zap, Shield, HardDrive, FileText, Brain,
  MessageSquare, AlertTriangle, CheckCircle2, Loader2,
  Sparkles, Calendar, ArrowUpRight, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { useAuth } from '../../../context/AuthContext'
import { getEdgeFunctionUrl } from '../../../lib/api'

interface UsageItem {
  used: number
  limit: number
}

interface UsageSummary {
  plan: 'free' | 'premium'
  status: string
  current_period_end?: string
  usage: {
    ai_analyses: UsageItem
    pdf_exports: UsageItem
    vault_uploads: UsageItem
    breakup: UsageItem
    red_flag: UsageItem
    storage: { used_bytes: number; limit_bytes: number }
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function UsageCard({
  label, icon: Icon, used, limit, accentClass,
}: {
  label: string
  icon: typeof Brain
  used: number
  limit: number
  accentClass: string
}) {
  const unlimited = limit === -1
  const pct = unlimited ? 100 : Math.min((used / limit) * 100, 100)
  const isNear = !unlimited && pct >= 80
  const isOver = !unlimited && pct >= 100

  const barClass = isOver
    ? 'bg-red-500'
    : isNear
    ? 'bg-amber-500'
    : unlimited
    ? 'bg-emerald-400'
    : accentClass

  return (
    <div className="group relative rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-shadow dark:bg-black dark:border-gray-700">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl ${accentClass.replace('bg-', 'bg-').replace('-500', '-100')}`}>
          <Icon className={`h-4 w-4 ${accentClass.replace('bg-', 'text-')}`} />
        </div>
        <span className={`text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${
          unlimited
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
            : isOver
            ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            : isNear
            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
        }`}>
          {unlimited ? '∞' : isOver ? 'Limit' : `${used}/${limit}`}
        </span>
      </div>
      <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-3 dark:text-white">{label}</p>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden dark:bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClass}`}
          style={{ width: `${unlimited ? 100 : pct}%`, opacity: unlimited ? 0.5 : 1 }}
        />
      </div>
    </div>
  )
}

const FEATURES = [
  { label: 'AI Chat Analyses',   free: '5 / month',   icon: Brain },
  { label: 'PDF Exports',        free: '3 / month',   icon: FileText },
  { label: 'Vault Files',        free: '50 files',    icon: Shield },
  { label: 'Storage',           free: '100 MB',      icon: HardDrive },
  { label: 'Breakup Generator', free: '3 / month',   icon: MessageSquare },
  { label: 'Red Flag Sessions', free: '3 / month',   icon: AlertTriangle },
  { label: 'Priority Support',  free: '—',           icon: Sparkles },
]

export default function SubscriptionPage() {
  const { sessionToken } = useAuth()
  const [data, setData] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  useEffect(() => {
    if (!sessionToken) return
    setLoading(true)
    fetch(`${getEdgeFunctionUrl('subscription')}/status`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d) })
      .catch(() => toast.error('Failed to load subscription'))
      .finally(() => setLoading(false))
  }, [sessionToken])

  async function handleUpgrade() {
    if (!sessionToken) return
    setUpgrading(true)
    try {
      const res = await fetch(`${getEdgeFunctionUrl('subscription')}/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      })
      const d = await res.json()
      if (!d.ok) throw new Error(d.error || 'Failed to create subscription')
      if (!d.subscription_id || !d.razorpay_key) throw new Error('Missing payment details from server')

      const Razorpay = (window as any).Razorpay
      if (!Razorpay) throw new Error('Payment gateway not loaded. Please refresh and try again.')

      const rzp = new Razorpay({
        key: d.razorpay_key,
        subscription_id: d.subscription_id,
        name: 'Blue Drum AI',
        description: 'Premium Plan — ₹199/month',
        theme: { color: '#2563eb' },
        handler: async (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await fetch(`${getEdgeFunctionUrl('subscription')}/verify`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyData.ok) {
              toast.success('Welcome to Premium! All limits unlocked.')
              const refreshRes = await fetch(`${getEdgeFunctionUrl('subscription')}/status`, {
                headers: { Authorization: `Bearer ${sessionToken}` },
              })
              const refreshData = await refreshRes.json()
              if (refreshData.ok) setData(refreshData)
            } else {
              toast.error(verifyData.error || 'Payment verification failed')
            }
          } catch {
            toast.error('Payment succeeded but verification failed. Please contact support.')
          }
        },
        modal: {
          ondismiss: () => toast('Payment cancelled', { icon: '⚠️' }),
        },
      })

      rzp.open()
    } catch (err: any) {
      toast.error(err.message || 'Failed to start upgrade')
    } finally {
      setUpgrading(false)
    }
  }

  async function handleCancel() {
    if (!sessionToken) return
    setCancelling(true)
    try {
      const res = await fetch(`${getEdgeFunctionUrl('subscription')}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      })
      const d = await res.json()
      if (!d.ok) throw new Error(d.error || 'Failed to cancel')
      toast.success(d.message || 'Subscription cancelled')
      setShowCancelConfirm(false)
      const refreshRes = await fetch(`${getEdgeFunctionUrl('subscription')}/status`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
      const refreshData = await refreshRes.json()
      if (refreshData.ok) setData(refreshData)
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel subscription')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Subscription" subtitle="Manage your plan and usage">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </DashboardLayout>
    )
  }

  const isPremium = data?.plan === 'premium'
  const isCancelled = data?.status === 'cancelled'
  const u = data?.usage

  const periodEnd = data?.current_period_end
    ? new Date(data.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const usageCards = [
    { label: 'AI Analyses',       icon: Brain,          used: u?.ai_analyses.used ?? 0,   limit: u?.ai_analyses.limit ?? 5,   accentClass: 'bg-violet-500 text-violet-500' },
    { label: 'PDF Exports',       icon: FileText,       used: u?.pdf_exports.used ?? 0,   limit: u?.pdf_exports.limit ?? 3,   accentClass: 'bg-blue-500 text-blue-500' },
    { label: 'Vault Files',       icon: Shield,         used: u?.vault_uploads.used ?? 0, limit: u?.vault_uploads.limit ?? 50, accentClass: 'bg-emerald-500 text-emerald-500' },
    { label: 'Breakup Generator', icon: MessageSquare,  used: u?.breakup.used ?? 0,       limit: u?.breakup.limit ?? 3,       accentClass: 'bg-amber-500 text-amber-500' },
    { label: 'Red Flag Sessions', icon: AlertTriangle,  used: u?.red_flag.used ?? 0,      limit: u?.red_flag.limit ?? 3,      accentClass: 'bg-rose-500 text-rose-500' },
  ]

  const storagePct = u
    ? u.storage.limit_bytes === -1
      ? 100
      : Math.min((u.storage.used_bytes / u.storage.limit_bytes) * 100, 100)
    : 0

  return (
    <DashboardLayout title="Subscription" subtitle="Manage your plan and usage">
      <div className="mx-auto max-w-4xl space-y-8">

        {/* ── Plan Hero ───────────────────────────────────────────────── */}
        {isPremium ? (
          <div className="relative rounded-3xl overflow-hidden shadow-xl">
            {/* gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700" />
            {/* decorative circles */}
            <div className="absolute -top-10 -right-10 h-52 w-52 rounded-full bg-white/5" />
            <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-white/5" />

            <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center gap-6">
              {/* badge + text */}
              <div className="flex items-center gap-4 flex-1">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
                  <Crown className="h-8 w-8 text-yellow-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-2xl font-bold text-white">Premium Plan</h2>
                    <span className="rounded-full bg-yellow-400/20 border border-yellow-300/30 px-2.5 py-0.5 text-xs font-semibold text-yellow-200">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-blue-100 text-sm">₹199 / month · All features unlimited</p>
                  {periodEnd && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-200">
                      <Calendar className="h-3.5 w-3.5" />
                      {isCancelled ? `Access until ${periodEnd}` : `Next billing ${periodEnd}`}
                    </div>
                  )}
                </div>
              </div>

              {/* action */}
              {!isCancelled && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white/80 hover:bg-white/20 transition-colors backdrop-blur-sm"
                >
                  Cancel plan
                </button>
              )}
              {isCancelled && (
                <div className="shrink-0 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200 text-center">
                  Cancels at period end
                </div>
              )}
            </div>

            {/* stat strip */}
            <div className="relative grid grid-cols-3 border-t border-white/10 divide-x divide-white/10">
              {[
                { label: 'Plan', value: 'Premium' },
                { label: 'Billing', value: '₹199 / mo' },
                { label: 'Status', value: isCancelled ? 'Cancelling' : 'Active' },
              ].map(s => (
                <div key={s.label} className="px-6 py-4 text-center">
                  <p className="text-xs text-blue-300 mb-0.5">{s.label}</p>
                  <p className="text-sm font-semibold text-white">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Free plan hero ── */
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white overflow-hidden dark:bg-black dark:border-gray-700">
            <div className="px-7 py-8 flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                  <Zap className="h-8 w-8 text-gray-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Free Plan</h2>
                  <p className="text-gray-500 text-sm mt-0.5 dark:text-gray-400">Core features with monthly limits</p>
                </div>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="shrink-0 flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-200 hover:bg-primary-700 disabled:opacity-60 transition-all hover:scale-[1.02] active:scale-[0.99]"
              >
                {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4 text-yellow-300" />}
                Upgrade to Premium
                {!upgrading && <ArrowUpRight className="h-4 w-4" />}
              </button>
            </div>

            {/* feature grid */}
            <div className="border-t border-gray-100 px-7 py-6 bg-gradient-to-br from-primary-50/40 to-indigo-50/40 dark:from-black dark:to-black dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">What you unlock at ₹199/month</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  'Unlimited AI analyses',
                  'Unlimited PDF exports',
                  '5 GB vault storage',
                  'Unlimited Breakup Generator',
                  'Unlimited Red Flag sessions',
                  'Priority support',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-500" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Usage Overview ───────────────────────────────────────────── */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 dark:text-white">Usage This Month</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {usageCards.map(card => (
              <UsageCard key={card.label} {...card} />
            ))}

            {/* Storage card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-shadow dark:bg-black dark:border-gray-700">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-indigo-100">
                  <HardDrive className="h-4 w-4 text-indigo-500" />
                </div>
                <span className={`text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${
                  u?.storage.limit_bytes === -1
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : storagePct >= 90
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {u?.storage.limit_bytes === -1
                    ? '∞'
                    : `${formatBytes(u?.storage.used_bytes ?? 0)} / ${formatBytes(u?.storage.limit_bytes ?? 0)}`}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-3 dark:text-white">Storage</p>
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden dark:bg-gray-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    u?.storage.limit_bytes === -1
                      ? 'bg-emerald-400 opacity-50'
                      : storagePct >= 90
                      ? 'bg-red-500'
                      : 'bg-indigo-500'
                  }`}
                  style={{ width: `${storagePct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Plan Comparison ──────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:bg-black dark:border-gray-700">
          <div className="grid grid-cols-3 px-6 py-4 bg-gray-50/60 border-b border-gray-100 dark:bg-gray-900 dark:border-gray-700">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Feature</span>
            <span className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Free</span>
            <span className="text-center text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">Premium</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {FEATURES.map((row, i) => (
              <div key={row.label} className={`grid grid-cols-3 px-6 py-3.5 text-sm ${i % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-900/30'}`}>
                <div className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                  <row.icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  {row.label}
                </div>
                <span className="text-center text-gray-400">{row.free}</span>
                <span className="text-center font-semibold text-primary-600 dark:text-primary-400">
                  {row.label === 'Priority Support' ? (
                    <CheckCircle2 className="h-4 w-4 mx-auto text-primary-500" />
                  ) : row.label === 'Storage' ? '5 GB' : 'Unlimited'}
                </span>
              </div>
            ))}
          </div>
          {!isPremium && (
            <div className="px-6 py-5 border-t border-gray-100 bg-gradient-to-r from-primary-50 to-indigo-50 flex flex-col sm:flex-row items-center gap-4 dark:from-black dark:to-black dark:border-gray-700">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">Ready to unlock everything?</p>
                <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-400">Start your Premium plan today for ₹199/month.</p>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="shrink-0 flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-primary-700 disabled:opacity-60 transition-colors"
              >
                {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Upgrade now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Cancel Confirm Modal ─────────────────────────────────────── */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-[200000] flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCancelConfirm(false) }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden dark:bg-black dark:border dark:border-gray-700">
            {/* header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Cancel Premium?</h3>
                  <p className="text-xs text-gray-500 mt-0.5 dark:text-gray-400">You'll lose access when the period ends</p>
                </div>
              </div>
              <button onClick={() => setShowCancelConfirm(false)} className="text-gray-400 hover:text-gray-600 transition-colors dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* what you lose */}
            <div className="px-6 pb-5 space-y-2">
              {[
                'Premium access until end of billing period',
                'Monthly limits apply after downgrade',
                'Your data and vault files are never deleted',
              ].map(item => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                  <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-gray-100 flex items-center justify-center dark:bg-gray-800">
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  </div>
                  {item}
                </div>
              ))}
            </div>

            <div className="flex gap-3 px-6 py-5 border-t border-gray-100 bg-gray-50/50 dark:bg-gray-900/50 dark:border-gray-700">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Keep Premium
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
