import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Status = 'verifying' | 'success' | 'error'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('verifying')
  const handled = useRef(false)

  useEffect(() => {
    function handleVerified() {
      if (handled.current) return
      handled.current = true
      setStatus('success')
      supabase.auth.signOut({ scope: 'local' })
      setTimeout(() => navigate('/sign-in?verified=success', { replace: true }), 1800)
    }

    const timeout = setTimeout(() => {
      if (!handled.current) setStatus('error')
    }, 15000)

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/forgot-password', { replace: true })
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        handleVerified()
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) handleVerified()
    })

    return () => {
      clearTimeout(timeout)
      sub?.subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-yellow-50/30 to-white px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
          <Shield className="h-8 w-8 text-primary-600" />
        </div>

        {status === 'verifying' && (
          <>
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary-600" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying your email...</h1>
            <p className="text-sm text-gray-500">Please wait while we confirm your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-500" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Email verified!</h1>
            <p className="text-sm text-gray-500">Redirecting you to sign in...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h1>
            <p className="text-sm text-gray-500 mb-6">
              The link may have expired or already been used. Try signing in — if your email
              isn't verified yet, you can request a new link.
            </p>
            <button
              onClick={() => navigate('/sign-in')}
              className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
              Go to sign in
            </button>
          </>
        )}
      </div>
    </div>
  )
}
