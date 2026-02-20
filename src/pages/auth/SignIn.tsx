import { useState, useEffect } from 'react'
import { ArrowLeft, Shield, FileText, Lock, Scale, CheckCircle2, Loader2, MailWarning, MailCheck } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function SignInPage() {
  const { signIn, resendEmailVerification, loading, user: currentUser, profileReady } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="flex min-h-screen flex-col sm:flex-row">

      {/* ── Left column ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:w-1/2">

        {/* Mobile brand bar — in document flow, no absolute overlap */}
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

        {/* Form area */}
        <div className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-10 lg:px-14 bg-white">
          <div className="mx-auto w-full max-w-md">

            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <h1 className="text-2xl font-bold text-gray-900 -tracking-[.04em] mb-1">Welcome back</h1>
            <p className="text-sm text-gray-500 mb-7">Sign in to your Blue Drum AI account</p>

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
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
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
      <div className="hidden sm:flex sm:w-1/2 sm:flex-col sm:justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-blue-700 p-8 lg:p-12">
        <div className="mx-auto max-w-md text-white">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">Blue Drum AI</p>
              <p className="text-sm text-primary-100">Evidence-based legal protection</p>
            </div>
          </div>

          <h2 className="mb-4 text-3xl font-bold leading-tight lg:text-4xl">
            Document your truth. Protect your rights.
          </h2>
          <p className="mb-8 text-lg text-primary-100">
            Secure evidence organization for Indian men and women navigating relationship disputes.
          </p>

          <div className="space-y-4">
            {[
              { icon: FileText, title: 'Evidence Vault',  desc: 'Store documents, photos, and files with timestamps' },
              { icon: Lock,     title: 'Privacy-First',   desc: 'Encrypted storage with strict access control' },
              { icon: Scale,    title: 'Lawyer-Ready',    desc: 'Export organized PDF case files instantly' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-sm text-primary-100">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-white/20 bg-white/10 p-4">
            <p className="mb-2 text-sm font-semibold text-white">Trusted by users across India</p>
            <div className="flex flex-wrap gap-3 text-xs text-primary-100">
              {['Secure', 'Private', 'Legal-compliant'].map(t => (
                <span key={t} className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
