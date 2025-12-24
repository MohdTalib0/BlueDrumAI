import { useState } from 'react'
import { ArrowLeft, Shield, AlertTriangle, Users, Sparkles, Loader2, MailCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Sign Up Page
 * Split-screen design: Sign up form on left, platform info on right
 */
export default function SignUpPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    const result = await signUp(email.trim(), password, firstName.trim(), lastName.trim())
    if (result.error) {
      setError(result.error)
    } else if (result.emailConfirmationRequired) {
      setInfo('Check your email to verify your account. After verification, you can sign in.')
    } else {
      navigate('/onboarding')
    }
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile Header - Blue Drum AI Branding */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary-600 to-blue-700 px-4 py-4 sm:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">Blue Drum AI</div>
            <div className="text-xs text-primary-100">Evidence-based legal protection</div>
          </div>
        </div>
      </div>

      {/* Left Side - Sign Up Form */}
      <div className="flex w-full flex-col justify-center bg-white px-4 py-12 pt-20 sm:w-1/2 sm:pt-12 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          {/* Back to home link */}
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          {/* Sign Up Form */}
          <div className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  placeholder="At least 8 characters"
                  minLength={8}
                />
              </div>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {info && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{info}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
              </button>
            </form>
          </div>

          {/* Sign In Link */}
          <div className="text-center text-sm text-gray-600">
            <p>
              Already have an account?{' '}
              <Link to="/sign-in" className="font-semibold text-primary-600 hover:text-primary-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Platform Information */}
      <div className="hidden bg-gradient-to-br from-primary-600 via-primary-700 to-blue-700 p-8 sm:flex sm:w-1/2 sm:flex-col sm:justify-center lg:p-12">
        <div className="mx-auto max-w-md text-white">
          {/* Logo/Brand */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold">Blue Drum AI</div>
              <div className="text-sm text-primary-100">Evidence-based legal protection</div>
            </div>
          </div>

          {/* Main Heading */}
          <h2 className="mb-4 text-3xl font-bold leading-tight lg:text-4xl">
            Start protecting yourself today
          </h2>
          <p className="mb-8 text-lg text-primary-100">
            Join thousands of users who are proactively documenting their relationships and protecting their rights.
          </p>

          {/* Modules Info */}
          <div className="mb-6 space-y-4">
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-200" />
                <div className="font-semibold text-white">Men's Module</div>
              </div>
              <p className="text-sm text-primary-100">
                Alimony clarity, false case protection, evidence organization
              </p>
            </div>

            <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-200" />
                <div className="font-semibold text-white">Women's Module</div>
              </div>
              <p className="text-sm text-primary-100">
                Dowry documentation, DV incident logs, maintenance rights
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-primary-100">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>AI-powered risk analysis</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary-100">
              <Users className="h-4 w-4 shrink-0" />
              <span>Used by legal professionals</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary-100">
              <Shield className="h-4 w-4 shrink-0" />
              <span>End-to-end encrypted storage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

