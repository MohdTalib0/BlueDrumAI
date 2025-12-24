import { useState } from 'react'
import { ArrowLeft, Shield, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Forgot Password Page
 * Sends a password reset email (Supabase)
 */
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
    if (result.error) {
      setError(result.error)
    } else {
      setMessage('If this email exists, a reset link has been sent.')
    }
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
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

      <div className="w-full max-w-md pt-20 sm:pt-0">
        <div className="mb-6 text-center">
          <Link
            to="/sign-in"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
        <div className="flex justify-center">
          <form onSubmit={handleSubmit} className="w-full space-y-4 rounded-2xl bg-white p-6 shadow-lg">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Reset your password</h2>
              <p className="text-sm text-gray-600">We’ll email you a reset link.</p>
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
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            {message && <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

