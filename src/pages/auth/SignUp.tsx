import { useState, useEffect } from 'react'
import { ArrowLeft, Shield, AlertTriangle, Users, Sparkles, Loader2, Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function SignUpPage() {
  const { signUp, user: currentUser, profileReady } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser && profileReady) {
      navigate(currentUser.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true })
    }
  }, [currentUser, profileReady, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await signUp(email.trim(), password, firstName.trim(), lastName.trim())
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }
    if (result.emailConfirmationRequired) {
      navigate('/sign-in?verified=pending')
      return
    }
    // No email confirmation needed — session is active.
    // Keep the spinner; the auto-redirect useEffect will navigate
    // once AuthContext finishes loading the profile.
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

            <h1 className="text-2xl font-bold text-gray-900 -tracking-[.04em] mb-1">Create your account</h1>
            <p className="text-sm text-gray-500 mb-7">Start protecting yourself with Blue Drum AI</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-colors"
                    placeholder="First"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-colors"
                    placeholder="Last"
                  />
                </div>
              </div>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-10 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-colors"
                    placeholder="At least 8 characters"
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
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center rounded-xl bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
              </button>

              <p className="text-center text-xs text-gray-400">
                By creating an account you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/sign-in" className="font-semibold text-primary-600 hover:text-primary-700">
                Sign in
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
            Start protecting yourself today
          </h2>
          <p className="mb-8 text-lg text-primary-100">
            Join thousands of users proactively documenting their relationships and protecting their rights.
          </p>

          <div className="mb-6 space-y-4">
            <div className="rounded-xl border border-white/20 bg-white/10 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-200" />
                <p className="font-semibold text-white">Men's Module</p>
              </div>
              <p className="text-sm text-primary-100">Alimony clarity, false case protection, evidence organization</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-200" />
                <p className="font-semibold text-white">Women's Module</p>
              </div>
              <p className="text-sm text-primary-100">Dowry documentation, DV incident logs, maintenance rights</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { icon: Sparkles, text: 'AI-powered risk analysis' },
              { icon: Users,    text: 'Used by legal professionals' },
              { icon: Shield,   text: 'End-to-end encrypted storage' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-primary-100">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
