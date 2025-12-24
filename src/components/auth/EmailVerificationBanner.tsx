import { useUser } from '@clerk/clerk-react'
import { AlertCircle, X } from 'lucide-react'
import { useState } from 'react'

/**
 * Email verification banner
 * Shows a banner if user's email is not verified
 */
export default function EmailVerificationBanner() {
  const { user } = useUser()
  const [dismissed, setDismissed] = useState(false)

  // Check if email is verified
  const emailVerified = user?.emailAddresses?.[0]?.verification?.status === 'verified'

  if (dismissed || emailVerified || !user) {
    return null
  }

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
      <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-800">Verify your email address</h3>
            <p className="mt-1 text-sm text-yellow-700">
              Please check your email ({user.emailAddresses[0]?.emailAddress}) and click the verification link to complete your account setup.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-md p-1 text-yellow-600 hover:bg-yellow-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

