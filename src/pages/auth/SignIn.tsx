import { useState } from 'react'
import { ArrowLeft, Shield, FileText, Lock, Scale, CheckCircle2, Loader2, MailWarning, MailCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Sign In Page
 * Split-screen design: Sign in form on left, platform info on right
 */
export default function SignInPage() {
  const { signIn, resendEmailVerification, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifyPrompt, setVerifyPrompt] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

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
    } else {
      // Wait a bit for session to be established, then check onboarding status
      setTimeout(async () => {
        try {
          const { supabase } = await import('../../lib/supabase')
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.access_token) {
            const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
            const response = await fetch(`${apiBase}/api/auth/me`, {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            })
            
            if (response.ok) {
              const data = await response.json()
              if (data.ok && data.user?.onboarding_completed) {
                navigate('/dashboard')
              } else {
                navigate('/onboarding')
              }
            } else {
              navigate('/onboarding')
            }
          } else {
            navigate('/onboarding')
          }
        } catch (err) {
          console.error('Error checking onboarding status:', err)
          navigate('/onboarding')
        }
      }, 100)
    }
    setSubmitting(false)
  }

  const handleResend = async () => {
    setError(null)
    setInfo(null)
    setVerifyPrompt(true)
    const res = await resendEmailVerification(email.trim())
    if (res.error) {
      setError(res.error)
    } else {
      setInfo('Verification email resent. Please check your inbox.')
    }
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

      {/* Left Side - Sign In Form */}
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

          {/* Sign In Form */}
          <div className="mb-6 min-h-[400px]">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div>{error}</div>
                    {verifyPrompt && (
                      <button
                        type="button"
                        onClick={handleResend}
                        className="text-xs font-semibold text-red-800 underline underline-offset-2"
                      >
                        Resend verification email
                      </button>
                    )}
                  </div>
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
                disabled={submitting || loading}
                className="flex w-full items-center justify-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
              </button>
            </form>
          </div>

          {/* Sign Up Link */}
          <div className="text-center text-sm text-gray-600">
            <p>
              Don't have an account?{' '}
              <Link to="/sign-up" className="font-semibold text-primary-600 hover:text-primary-700">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Platform Information (Hidden on factor-two for better UX) */}
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
            Document your truth. Protect your rights.
          </h2>
          <p className="mb-8 text-lg text-primary-100">
            Secure evidence organization for Indian men and women navigating relationship disputes.
          </p>

          {/* Features List */}
          <div className="space-y-4">
            {[
              {
                icon: FileText,
                title: 'Evidence Vault',
                desc: 'Store documents, photos, and files with timestamps',
              },
              {
                icon: Lock,
                title: 'Privacy-First',
                desc: 'Encrypted storage with strict access control',
              },
              {
                icon: Scale,
                title: 'Lawyer-Ready',
                desc: 'Export organized PDF case files instantly',
              },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white">{feature.title}</div>
                  <div className="mt-1 text-sm text-primary-100">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <div className="mb-2 text-sm font-semibold text-white">Trusted by users across India</div>
            <div className="flex flex-wrap gap-2 text-xs text-primary-100">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Secure
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Private
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Legal-compliant
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

