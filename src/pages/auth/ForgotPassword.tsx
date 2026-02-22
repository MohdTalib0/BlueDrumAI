import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Shield, Loader2, MailCheck, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

type Mode = 'request' | 'reset'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('request')
  const listened = useRef(false)

  // Request-link state
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset-password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  useEffect(() => {
    if (listened.current) return
    listened.current = true

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset')
        setError(null)
        setMessage(null)
      }
    })

    // Also check current session for recovery token already processed
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && window.location.hash.includes('type=recovery')) {
        setMode('reset')
      }
    })

    return () => { sub?.subscription.unsubscribe() }
  }, [])

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)
    const result = await resetPassword(email.trim())
    if (result.error) setError(result.error)
    else setMessage('If this email exists, a reset link has been sent. Check your inbox.')
    setSubmitting(false)
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setResetting(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
    setResetting(false)

    if (updateErr) {
      setError(updateErr.message)
      return
    }

    setResetDone(true)
    await supabase.auth.signOut({ scope: 'local' })
    setTimeout(() => navigate('/sign-in', { replace: true }), 2500)
  }

  return (
    <div className="flex min-h-screen flex-col">

      {/* Mobile brand bar */}
      <div className="bg-gradient-to-r from-primary-600 to-blue-700 px-5 py-4 sm:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-white leading-tight">Blue Drum AI</p>
            <p className="text-xs text-primary-100">Evidence-based legal protection</p>
          </div>
        </div>
      </div>

      {/* Centered card */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 dark:bg-black px-5 py-10">
        <div className="w-full max-w-md">

          <Link
            to="/sign-in"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <div className="rounded-2xl bg-white dark:bg-black shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Card header */}
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-black dark:to-black border-b border-gray-100 dark:border-gray-700 px-6 py-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600/10 dark:bg-gray-800 border border-primary-100 dark:border-gray-700">
                <KeyRound className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white -tracking-[.03em]">
                  {mode === 'request' ? 'Reset your password' : 'Set new password'}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {mode === 'request' ? "We'll email you a reset link" : 'Choose a strong new password'}
                </p>
              </div>
            </div>

            {/* ── Request Reset Link Form ── */}
            {mode === 'request' && (
              <form onSubmit={handleRequestSubmit} className="px-6 py-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-gray-300 dark:bg-black dark:border-gray-600 dark:text-gray-100 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-black dark:border-red-700/40 dark:text-red-300 px-3 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 dark:bg-black dark:border-green-700/40 dark:text-green-300 px-3 py-3 text-sm text-green-800">
                    <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center rounded-xl bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
                </button>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Remembered your password?{' '}
                  <Link to="/sign-in" className="font-semibold text-primary-600 hover:text-primary-700">
                    Sign in
                  </Link>
                </p>
              </form>
            )}

            {/* ── Set New Password Form ── */}
            {mode === 'reset' && !resetDone && (
              <form onSubmit={handleResetSubmit} className="px-6 py-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-gray-300 dark:bg-black dark:border-gray-600 dark:text-gray-100 px-4 py-3 pr-10 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-colors"
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-300 dark:bg-black dark:border-gray-600 dark:text-gray-100 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-colors"
                    placeholder="Re-enter new password"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-black dark:border-red-700/40 dark:text-red-300 px-3 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetting}
                  className="flex w-full items-center justify-center rounded-xl bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                >
                  {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
                </button>
              </form>
            )}

            {/* ── Success State ── */}
            {mode === 'reset' && resetDone && (
              <div className="px-6 py-8 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Password updated!</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting you to sign in...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
