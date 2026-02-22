import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Shield, AlertTriangle, ArrowRight } from 'lucide-react'
import { getEdgeFunctionUrl, authHeaders } from '../lib/api'


export default function Onboarding() {
  const { sessionToken, user, loading: authLoading, profileReady, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [gender, setGender] = useState<'male' | 'female' | 'both' | ''>('')
  const [relationshipStatus, setRelationshipStatus] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profileReady && user?.onboarding_completed) {
      navigate('/dashboard', { replace: true })
    }
  }, [profileReady, user?.onboarding_completed, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gender || !relationshipStatus) {
      setError('Please select all options')
      return
    }

    setSaving(true)
    setError('')

    try {
      const token = sessionToken
      if (!token || !user) {
        throw new Error('Not authenticated')
      }

      // Update user profile (user should already be synced from useEffect)
      const headers = authHeaders(token!)
      const resp = await fetch(`${getEdgeFunctionUrl('auth')}/me`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          gender,
          relationship_status: relationshipStatus,
          onboarding_completed: true,
        }),
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => null)
        throw new Error(data?.error || 'Failed to save profile')
      }

      await refreshProfile()
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setSaving(false)
    }
  }

  if (!profileReady || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400">Setting up your account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to Blue Drum AI</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Let's set up your profile to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black p-8 shadow-lg">
          {/* Gender Selection */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-900 dark:text-white">Which module applies to you?</label>
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                  gender === 'male'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Men's Module</div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Alimony, false cases</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGender('female')}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                  gender === 'female'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Women's Module</div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Dowry, DV protection</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGender('both')}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                  gender === 'both'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Both Modules</div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Full access</div>
                </div>
              </button>
            </div>
          </div>

          {/* Relationship Status */}
          <div>
            <label htmlFor="relationship" className="mb-3 block text-sm font-semibold text-gray-900 dark:text-white">
              What is your relationship status?
            </label>
            <select
              id="relationship"
              value={relationshipStatus}
              onChange={(e) => setRelationshipStatus(e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select status</option>
              <option value="single">Single</option>
              <option value="dating">Dating</option>
              <option value="live_in">Live-in Relationship</option>
              <option value="married">Married</option>
              <option value="separated">Separated</option>
              <option value="divorced">Divorced</option>
            </select>
          </div>

          {error && <div className="rounded-lg bg-red-50 dark:bg-black border border-transparent dark:border-red-700/40 p-3 text-sm text-red-600 dark:text-red-300">{error}</div>}

          <button
            type="submit"
            disabled={saving || !gender || !relationshipStatus}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                Continue to Dashboard
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

