import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Shield, AlertTriangle, ArrowRight } from 'lucide-react'

export default function Onboarding() {
  const { sessionToken, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [gender, setGender] = useState<'male' | 'female' | 'both' | ''>('')
  const [relationshipStatus, setRelationshipStatus] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(true)
  const [error, setError] = useState('')

  // Check if user has already completed onboarding and redirect if so
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (authLoading) return
      if (!sessionToken || !user) {
        setSyncing(false)
        return
      }

      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

        // Check user's onboarding status
        const response = await fetch(`${apiBase}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.ok && data.user?.onboarding_completed) {
            // User has already completed onboarding, redirect to dashboard
            navigate('/dashboard')
            return
          }
        }

        // Sync user from Supabase Auth to public.users table
        const syncResp = await fetch(`${apiBase}/api/auth/sync-user`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        })

        if (!syncResp.ok) {
          const syncData = await syncResp.json().catch(() => null)
          console.warn('User sync warning:', syncData?.error || 'Failed to sync user')
          // Continue anyway - the PATCH endpoint will try to sync if user doesn't exist
        }
      } catch (err) {
        console.error('Failed to check onboarding status:', err)
        // Continue anyway
      } finally {
        setSyncing(false)
      }
    }

    checkOnboardingStatus()
  }, [authLoading, sessionToken, user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gender || !relationshipStatus) {
      setError('Please select all options')
      return
    }

    setSaving(true)
    setError('')

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      const token = sessionToken
      if (!token || !user) {
        throw new Error('Not authenticated')
      }

      // Update user profile (user should already be synced from useEffect)
      const resp = await fetch(`${apiBase}/api/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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

      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setSaving(false)
    }
  }

  if (syncing || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Blue Drum AI</h1>
          <p className="mt-2 text-gray-600">Let's set up your profile to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          {/* Gender Selection */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-900">Which module applies to you?</label>
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                  gender === 'male'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">Men's Module</div>
                  <div className="mt-1 text-xs text-gray-600">Alimony, false cases</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGender('female')}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                  gender === 'female'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
                <div>
                  <div className="font-semibold text-gray-900">Women's Module</div>
                  <div className="mt-1 text-xs text-gray-600">Dowry, DV protection</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGender('both')}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                  gender === 'both'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                <div>
                  <div className="font-semibold text-gray-900">Both Modules</div>
                  <div className="mt-1 text-xs text-gray-600">Full access</div>
                </div>
              </button>
            </div>
          </div>

          {/* Relationship Status */}
          <div>
            <label htmlFor="relationship" className="mb-3 block text-sm font-semibold text-gray-900">
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

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

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

