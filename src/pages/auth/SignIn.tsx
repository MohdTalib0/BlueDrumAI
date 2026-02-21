import { useState, useEffect } from 'react'
import { ArrowLeft, FileText, Lock, Scale, Loader2, MailWarning, MailCheck, Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function SignInPage() {
  const { signIn, resendEmailVerification, loading, user: currentUser, profileReady } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifyPrompt, setVerifyPrompt] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (currentUser && profileReady) {
      navigate(currentUser.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true })
    }
  }, [currentUser, profileReady, navigate])

  useEffect(() => {
    const v = searchParams.get('verified')
    if (v === 'pending') {
      setInfo('We sent a verification link to your email. Please verify, then sign in.')
    } else if (v === 'success') {
      setInfo('Email verified successfully! You can now sign in.')
    }
    if (v) {
      searchParams.delete('verified')
      setSearchParams(searchParams, { replace: true })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setVerifyPrompt(false)
    setSubmitting(true)
    const result = await signIn(email.trim(), password)
    if (result.error) {
      if (result.emailNotConfirmed) {
        setVerifyPrompt(true)
        setError('Email not verified. Please verify your email to continue.')
      } else {
        setError(result.error)
      }
      setSubmitting(false)
      return
    }
    // signIn succeeded — keep the spinner active.
    // The auto-redirect useEffect above will navigate once
    // AuthContext has finished loading the profile.
  }

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Enter your email address above, then click resend.')
      return
    }
    setResending(true)
    setError(null)
    setInfo(null)
    const res = await resendEmailVerification(email.trim())
    setResending(false)
    if (res.error) setError(res.error)
    else setInfo('Verification email resent. Please check your inbox.')
  }

  return (
    <div className="relative flex min-h-screen flex-col sm:flex-row">

      {/* Mobile background — Lady Justice with low opacity */}
      <div className="absolute inset-0 sm:hidden">
        <img
          src="https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&w=800&q=80"
          alt=""
          className="h-full w-full object-cover opacity-[0.06]"
        />
      </div>

      {/* ── Left column ────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col sm:w-1/2">

        {/* Mobile header — matches dashboard style */}
        <div className="border-b border-blue-100/50 backdrop-blur-sm bg-gradient-to-br from-blue-50/40 via-yellow-50/20 to-white/40 px-4 py-3 sm:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="Blue Drum AI" className="h-8 w-8 shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Blue Drum AI</p>
                <p className="text-[11px] text-gray-500">Evidence-based legal vigilance</p>
              </div>
            </div>
            <Link to="/" className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Form area */}
        <div className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-10 lg:px-14 sm:bg-white">
          <div className="mx-auto w-full max-w-md">

            <Link
              to="/"
              className="mb-6 hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <h1 className="text-2xl font-bold text-gray-900 -tracking-[.04em] mb-1 text-center sm:text-left">Welcome back</h1>
            <p className="text-sm text-gray-500 mb-7 text-center sm:text-left">Sign in to your Blue Drum AI account</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-10 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                  <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div>{error}</div>
                    {verifyPrompt && (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200 disabled:opacity-60 transition-colors"
                      >
                        {resending ? <Loader2 className="h-3 w-3 animate-spin" /> : <MailCheck className="h-3 w-3" />}
                        Resend verification email
                      </button>
                    )}
                  </div>
                </div>
              )}

              {info && (
                <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-800">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{info}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || loading}
                className="flex w-full items-center justify-center rounded-xl bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/sign-up" className="font-semibold text-primary-600 hover:text-primary-700">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Right column — desktop only ──────────────────────────────────── */}
      <div className="hidden sm:flex sm:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&w=1200&q=80"
          alt="Lady Justice"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-gray-900/30" />

        <div className="relative z-10 flex flex-col items-center justify-center p-10 lg:p-16 h-full text-center">
          <div className="max-w-lg">
            <div className="mb-8 flex items-center justify-center gap-4">
              <img src="/logo.svg" alt="Blue Drum AI" className="h-12 w-12" />
              <span className="text-3xl font-bold text-white tracking-tight">Blue Drum AI</span>
            </div>
            <h2 className="mb-4 text-3xl font-bold leading-snug text-white lg:text-4xl">
              Document your truth.<br />Protect your rights.
            </h2>
            <p className="mb-8 text-base leading-relaxed text-gray-300 max-w-md mx-auto">
              Securely organize evidence, analyze conversations with AI, and generate lawyer-ready case files — built specifically for Indian family law.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: FileText, text: 'Evidence Vault' },
                { icon: Lock, text: 'Encrypted Storage' },
                { icon: Scale, text: 'Lawyer-Ready Exports' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                  <Icon className="h-4 w-4" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
