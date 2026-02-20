import { useState } from 'react'
import { ArrowLeft, Shield, Loader2, MailCheck, KeyRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)
    const result = await resetPassword(email.trim())
    if (result.error) setError(result.error)
    else setMessage('If this email exists, a reset link has been sent. Check your inbox.')
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen flex-col">

      {/* Mobile brand bar — in document flow */}
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

      {/* Centered card area */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-5 py-10">
        <div className="w-full max-w-md">

          {/* Back link */}
          <Link
            to="/sign-in"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <div className="rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
            {/* Card header */}
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 border-b border-gray-100 px-6 py-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600/10 border border-primary-100">
                <KeyRound className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 -tracking-[.03em]">Reset your password</h1>
                <p className="text-xs text-gray-500 mt-0.5">We'll email you a reset link</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
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

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800">
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

              <p className="text-center text-sm text-gray-500">
                Remembered your password?{' '}
                <Link to="/sign-in" className="font-semibold text-primary-600 hover:text-primary-700">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
