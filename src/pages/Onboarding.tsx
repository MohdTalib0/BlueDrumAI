import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Brain,
  TrendingUp,
  FileText,
  Upload,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react'
import { getEdgeFunctionUrl, apiFetch } from '../lib/api'

const whatYouCanDo = [
  {
    icon: Lock,
    title: 'Store evidence securely',
    desc: 'Upload screenshots, chat exports, documents, and photos. Everything is encrypted on your device.',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: Brain,
    title: 'Analyze conversations with AI',
    desc: 'Paste WhatsApp or SMS chats. AI identifies key moments and patterns - saving you hours.',
    color: 'from-purple-500 to-pink-600',
  },
  {
    icon: TrendingUp,
    title: 'Track income & expenses',
    desc: 'Log financial records for maintenance or alimony. Generate court-format affidavits.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: FileText,
    title: 'Export a case file for your lawyer',
    desc: 'Generate a structured PDF with evidence, timelines, and summaries your lawyer can use right away.',
    color: 'from-amber-500 to-orange-600',
  },
]

const firstActions = [
  { id: 'vault', icon: Upload, label: 'Upload my first document', desc: 'Start building your evidence vault', path: '/dashboard/vault/upload' },
  { id: 'chat', icon: MessageSquare, label: 'Analyze a conversation', desc: 'Paste or upload a chat export', path: '/dashboard/red-flag-radar' },
  { id: 'income', icon: TrendingUp, label: 'Track my finances', desc: 'Set up income & expense tracking', path: '/dashboard/income-tracker' },
  { id: 'explore', icon: Brain, label: 'Just explore the dashboard', desc: 'I\'ll look around first', path: '/dashboard' },
]

export default function Onboarding() {
  const { sessionToken, user, loading: authLoading, profileReady, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [gender, setGender] = useState<'male' | 'female' | 'both' | ''>('')
  const [relationshipStatus, setRelationshipStatus] = useState<string>('')
  const [firstAction, setFirstAction] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const completingRef = useRef(false)

  const totalSteps = 3

  useEffect(() => {
    if (completingRef.current) return
    if (profileReady && user?.onboarding_completed) {
      navigate('/dashboard', { replace: true })
    }
  }, [profileReady, user?.onboarding_completed, navigate])

  const handleComplete = async () => {
    if (!gender || !relationshipStatus) {
      setStep(1)
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

      const resp = await apiFetch(`${getEdgeFunctionUrl('auth')}/me`, token, {
        method: 'PATCH',
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

      completingRef.current = true
      await refreshProfile()

      const selected = firstActions.find((a) => a.id === firstAction)
      navigate(selected?.path || '/dashboard', { replace: true })
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
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Step {step} of {totalSteps}</p>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i < step ? 'w-8 bg-primary-500' : 'w-2 bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Step 1: Context */}
        {step === 1 && (
          <div>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to Blue Drum AI</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Tell us a bit about your situation so we can show you the right tools.</p>
            </div>

            <div className="space-y-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black p-8 shadow-lg">
              <div>
                <label className="mb-3 block text-sm font-semibold text-gray-900 dark:text-white">Which tools would be most helpful for you?</label>
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
                      <div className="font-semibold text-gray-900 dark:text-white">For Men</div>
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Alimony, evidence & finances</div>
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
                      <div className="font-semibold text-gray-900 dark:text-white">For Women</div>
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Dowry, incidents & maintenance</div>
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
                      <div className="font-semibold text-gray-900 dark:text-white">Show Me Both</div>
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Access all tools</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="relationship" className="mb-3 block text-sm font-semibold text-gray-900 dark:text-white">
                  What best describes your current situation?
                </label>
                <select
                  id="relationship"
                  value={relationshipStatus}
                  onChange={(e) => setRelationshipStatus(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select your situation</option>
                  <option value="married">Married - considering next steps</option>
                  <option value="separated">Separated - preparing documentation</option>
                  <option value="divorced">Divorced - ongoing proceedings</option>
                  <option value="live_in">Live-in - documenting the relationship</option>
                  <option value="dating">Dating - want to be prepared</option>
                  <option value="single">Single - researching for someone I know</option>
                </select>
              </div>

              {error && <div className="rounded-lg bg-red-50 dark:bg-black border border-transparent dark:border-red-700/40 p-3 text-sm text-red-600 dark:text-red-300">{error}</div>}

              <button
                type="button"
                onClick={() => { if (gender && relationshipStatus) { setError(''); setStep(2) } else { setError('Please select all options') } }}
                disabled={!gender || !relationshipStatus}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: What You Can Do */}
        {step === 2 && (
          <div>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Here&apos;s what you can do</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Blue Drum AI helps you organize evidence and build a structured case file for your lawyer.</p>
            </div>

            <div className="space-y-4">
              {whatYouCanDo.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black p-5 shadow-sm"
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} shadow-md`}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                Got it - let&apos;s start
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Start with One Action */}
        {step === 3 && (
          <div>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">What would you like to do first?</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Pick one to get started - you can always do the rest later.</p>
            </div>

            <div className="space-y-3">
              {firstActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => setFirstAction(action.id)}
                  className={`w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                    firstAction === action.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-black hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    firstAction === action.id ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  } transition-colors`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white">{action.label}</div>
                    <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{action.desc}</div>
                  </div>
                  {firstAction === action.id && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary-500" />
                  )}
                </button>
              ))}
            </div>

            {error && <div className="mt-4 rounded-lg bg-red-50 dark:bg-black border border-transparent dark:border-red-700/40 p-3 text-sm text-red-600 dark:text-red-300">{error}</div>}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Setting up...
                  </>
                ) : (
                  <>
                    Let&apos;s go
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Trust note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <Lock className="h-3.5 w-3.5" />
          <span>Your data is encrypted and private - even from us</span>
        </div>
      </div>
    </div>
  )
}
