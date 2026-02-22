import { useState, useEffect } from 'react'

import { User, Mail, Shield, Calendar, LogOut, Key, Save, Edit2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { useAuth } from '../../../context/AuthContext'
import { getEdgeFunctionUrl, apiFetch } from '../../../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type RelationshipStatus = 'single' | 'dating' | 'live_in' | 'married' | 'separated' | 'divorced'
type GenderModule = 'male' | 'female' | 'both'

interface FullProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  gender: GenderModule | null
  relationship_status: RelationshipStatus | null
  onboarding_completed: boolean
  login_count: number
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RELATIONSHIP_LABELS: Record<RelationshipStatus, string> = {
  single: 'Single',
  dating: 'Dating',
  live_in: 'Live-in Relationship',
  married: 'Married',
  separated: 'Separated',
  divorced: 'Divorced',
}

const MODULE_CONFIG: Record<GenderModule, { label: string; color: string; bg: string; border: string; icon: string }> = {
  male:   { label: "Men's Module",  color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-700/40',  icon: '👨' },
  female: { label: "Women's Module", color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-700/40', icon: '👩' },
  both:   { label: 'Full Access',   color: 'text-primary-700 dark:text-primary-300', bg: 'bg-primary-50 dark:bg-primary-900/20', border: 'border-primary-200 dark:border-primary-700/40', icon: '⚖️' },
}

function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName.slice(0, 2).toUpperCase()
  if (email) return email.slice(0, 2).toUpperCase()
  return 'U'
}

function memberSince(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, sessionToken, signOut, refreshProfile, resetPassword } = useAuth()

  const [profile, setProfile] = useState<FullProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus | ''>('')
  const [saving, setSaving] = useState(false)

  // Password reset
  const [sendingReset, setSendingReset] = useState(false)

  // ── Load full profile ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionToken) return
    setLoadingProfile(true)
    apiFetch(`${getEdgeFunctionUrl('auth')}/me`, sessionToken)
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.user) {
          const u = data.user
          setProfile(u)
          setFirstName(u.first_name || '')
          setLastName(u.last_name || '')
          setRelationshipStatus(u.relationship_status || '')
        }
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoadingProfile(false))
  }, [sessionToken])

  // ── Save name + relationship ───────────────────────────────────────────────
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionToken) return
    setSaving(true)
    try {
      const body: Record<string, string> = {}
      if (firstName.trim()) body.first_name = firstName.trim().slice(0, 100)
      if (lastName.trim())  body.last_name  = lastName.trim().slice(0, 100)
      if (relationshipStatus) body.relationship_status = relationshipStatus

      const res = await apiFetch(`${getEdgeFunctionUrl('auth')}/me`, sessionToken, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Save failed')

      await refreshProfile()
      setProfile(p => p ? { ...p, first_name: firstName.trim() || null, last_name: lastName.trim() || null, relationship_status: (relationshipStatus || null) as RelationshipStatus | null } : p)
      setEditing(false)
      toast.success('Profile updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // ── Password reset ─────────────────────────────────────────────────────────
  async function handlePasswordReset() {
    if (!user?.email) return
    setSendingReset(true)
    try {
      const { error } = await resetPassword(user.email)
      if (error) throw new Error(error)
      toast.success('Password reset email sent — check your inbox')
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email')
    } finally {
      setSendingReset(false)
    }
  }

  // ── Sign out ───────────────────────────────────────────────────────────────
  async function handleSignOut() {
    try { await signOut() } catch { /* clearAuth already handled */ }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const initials = getInitials(profile?.first_name, profile?.last_name, user?.email)
  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`
    : user?.email?.split('@')[0] || 'User'
  const moduleInfo = profile?.gender ? MODULE_CONFIG[profile.gender] : null

  if (loadingProfile) {
    return (
      <DashboardLayout title="My Profile" subtitle="Manage your account">
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="My Profile" subtitle="Manage your account settings">

      <div className="mx-auto max-w-4xl space-y-6">

        {/* ── Profile Overview Card ────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Banner */}
          <div className="h-24 bg-gradient-to-r from-primary-600 via-primary-500 to-blue-400" />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="-mt-12 mb-4 flex items-end justify-between">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white dark:border-black bg-gradient-to-br from-primary-600 to-blue-500 shadow-lg">
                <span className="text-3xl font-bold text-white">{initials}</span>
              </div>
              {profile?.onboarding_completed && (
                <span className="flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-black px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700/40">
                  <CheckCircle className="h-3.5 w-3.5" /> Profile Complete
                </span>
              )}
            </div>

            {/* Name & email */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white -tracking-[0.05em]">{displayName}</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {user?.email}
            </p>

            {/* Stats row */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { icon: Calendar, label: 'Member Since', value: profile?.created_at ? memberSince(profile.created_at) : '—' },
                { icon: Shield, label: 'Module', value: moduleInfo?.label || '—' },
                { icon: User, label: 'Status', value: profile?.relationship_status ? RELATIONSHIP_LABELS[profile.relationship_status] : '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* ── Edit Profile Card ──────────────────────────────────────────── */}
          <div className="rounded-2xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Personal Info</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Update your name and relationship status</p>
              </div>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-black px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="px-6 py-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    disabled={!editing}
                    placeholder="Your first name"
                    maxLength={100}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-black px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary-400 focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    disabled={!editing}
                    placeholder="Your last name"
                    maxLength={100}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-black px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary-400 focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Relationship Status</label>
                <select
                  value={relationshipStatus}
                  onChange={e => setRelationshipStatus(e.target.value as RelationshipStatus)}
                  disabled={!editing}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-black px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-400 focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  <option value="">Select status</option>
                  {(Object.entries(RELATIONSHIP_LABELS) as [RelationshipStatus, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-black px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-400">Email cannot be changed here</p>
              </div>

              {editing && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
                  >
                    {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false)
                      setFirstName(profile?.first_name || '')
                      setLastName(profile?.last_name || '')
                      setRelationshipStatus(profile?.relationship_status || '')
                    }}
                    className="rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* ── Right column ───────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Module Access — read-only, locked to gender set at onboarding */}
            <div className="rounded-2xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Module Access</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Determined by your gender set during onboarding</p>
              </div>
              <div className="px-6 py-5">
                {moduleInfo ? (
                  <div className={`flex items-center gap-3 rounded-xl border-2 px-4 py-4 dark:bg-black ${moduleInfo.bg} ${moduleInfo.border}`}>
                    <span className="text-2xl">{moduleInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${moduleInfo.color}`}>{moduleInfo.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {profile?.gender === 'male'   && 'Income Tracker · Breakup Generator · Consent Vault'}
                        {profile?.gender === 'female' && 'Dowry Vault · DV Log · Maintenance Calculator · Consent Vault'}
                        {profile?.gender === 'both'   && 'All modules enabled'}
                      </div>
                    </div>
                    <CheckCircle className={`h-4 w-4 shrink-0 ${moduleInfo.color}`} />
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No module assigned. Please complete onboarding.</p>
                )}
                <p className="mt-3 text-xs text-gray-400 flex items-start gap-1.5">
                  <Shield className="h-3.5 w-3.5 shrink-0 mt-px text-gray-400" />
                  Module access is locked to your gender to ensure content relevance and legal accuracy. Contact support if you believe this is incorrect.
                </p>
              </div>
            </div>

            {/* Security Card */}
            <div className="rounded-2xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Security</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage your account security</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                <button
                  onClick={handlePasswordReset}
                  disabled={sendingReset}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-left hover:bg-white dark:hover:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 transition-all disabled:opacity-60"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-gray-800">
                    {sendingReset
                      ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      : <Key className="h-4 w-4 text-blue-600" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Change Password</div>
                    <div className="text-xs text-gray-400">Send a password reset email</div>
                  </div>
                </button>

                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl border border-red-100 dark:border-red-700/40 bg-red-50 dark:bg-black px-4 py-3 text-left hover:bg-red-100 dark:hover:bg-gray-900 transition-all"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-gray-800">
                    <LogOut className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-red-700 dark:text-red-400">Sign Out</div>
                    <div className="text-xs text-red-400">You will be redirected to the login page</div>
                  </div>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>


    </DashboardLayout>
  )
}
