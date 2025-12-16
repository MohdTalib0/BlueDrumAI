import { useEffect, useState } from 'react'
import { X, CheckCircle2, Loader2, Sparkles } from 'lucide-react'

interface SignupFormProps {
  onClose: () => void
}

function SignupForm({ onClose }: SignupFormProps) {
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'both' | ''>('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !gender) {
      setErrorMessage('Please fill in all fields')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address')
      return
    }

    setStatus('loading')
    setErrorMessage('')

    try {
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001'

      const resp = await fetch(`${apiBase}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          interest: gender,
          source: 'landing_page',
        }),
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => null)
        setStatus('error')
        setErrorMessage(data?.error || 'Could not save signup. Please try again.')
        return
      }

      setStatus('success')
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose()
        setStatus('idle')
        setEmail('')
        setGender('')
      }, 3000)
    } catch (error) {
      console.error('Signup error:', error)
      setStatus('error')
      setErrorMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-3 pt-6 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Join waitlist"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-4 text-white sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <Sparkles className="h-4 w-4" />
                Early access
              </div>
              <h2 className="mt-2 text-xl font-bold sm:mt-3 sm:text-3xl">Join the Waitlist</h2>
              <p className="mt-1 text-sm text-white/80">Get notified when we open private beta.</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            </div>
          </div>

          {status === 'success' ? (
            <div className="px-5 py-10 text-center sm:px-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">You're on the list!</h3>
              <p className="text-gray-600">We’ll email you when early access opens.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-6">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
                disabled={status === 'loading'}
                autoFocus
              />
            </div>

            <div>
              <div className="mb-2 block text-sm font-semibold text-gray-700">I’m interested in</div>

              {/* Mobile: compact select */}
              <div className="sm:hidden">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  disabled={status === 'loading'}
                  className="input-field"
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  <option value="male">Men’s module</option>
                  <option value="female">Women’s module</option>
                  <option value="both">Both</option>
                </select>
              </div>

              {/* Desktop: detailed cards */}
              <div className="hidden grid gap-2 sm:grid">
                <label className="group flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 hover:bg-gray-50 sm:p-4">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={(e) => setGender(e.target.value as 'male')}
                    className="mt-1"
                    disabled={status === 'loading'}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">Men’s module</div>
                    <div className="text-sm text-gray-600">Evidence, income/expense tracking, and export.</div>
                  </div>
                </label>

                <label className="group flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 hover:bg-gray-50 sm:p-4">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={(e) => setGender(e.target.value as 'female')}
                    className="mt-1"
                    disabled={status === 'loading'}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">Women’s module</div>
                    <div className="text-sm text-gray-600">Dowry/DV documentation and organized case files.</div>
                  </div>
                </label>

                <label className="group flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 hover:bg-gray-50 sm:p-4">
                  <input
                    type="radio"
                    name="gender"
                    value="both"
                    checked={gender === 'both'}
                    onChange={(e) => setGender(e.target.value as 'both')}
                    className="mt-1"
                    disabled={status === 'loading'}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">Both</div>
                    <div className="text-sm text-gray-600">Full access to both modules.</div>
                  </div>
                </label>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm sm:py-4 sm:text-base"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Joining…
                </>
              ) : (
                'Join waitlist'
              )}
            </button>

            <p className="text-center text-xs text-gray-500">
              This is an information tool, not legal advice. We won’t spam you.
            </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default SignupForm

