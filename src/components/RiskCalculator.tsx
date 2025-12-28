import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Loader2, Scale, Shield, X } from 'lucide-react'

type Gender = 'male' | 'female' | ''

type AIResponse = {
  riskScore: number
  readinessScore: number
  summary: string
  whatToDoNow: string[]
  relevantLaws: Array<{ law: string; relevance: string; note?: string }>
  caseExamples: Array<{ case: string; relevance: string; takeaway: string }>
  documentationChecklist: string[]
  safetyNote?: string
}

const MEN_QUESTIONS = [
  {
    id: 'stage',
    question: 'What is your relationship status?',
    type: 'radio',
    options: [
      { value: 'dating', label: 'Dating' },
      { value: 'live_in', label: 'Live-in relationship' },
      { value: 'married', label: 'Married' },
      { value: 'separated', label: 'Separated / Divorced' },
    ],
  },
  {
    id: 'signals',
    question: 'Which of these situations apply to you? (Select all that apply)',
    type: 'checkbox',
    options: [
      { value: 'threat_case', label: 'Partner threatened to file a complaint/case' },
      { value: 'money_demand', label: 'Money demand / settlement pressure' },
      { value: 'marriage_pressure', label: 'Pressure to marry with threats' },
      { value: 'family_escalation', label: 'Family involvement / escalation' },
      { value: 'social_threat', label: 'Threat to defame publicly / tell employer' },
      { value: 'violence', label: 'Physical violence happened' },
      { value: 'self_harm_threat', label: 'Self-harm threats used to control you' },
    ],
  },
  {
    id: 'readiness',
    question: 'What evidence do you currently have? (Select all that apply)',
    type: 'checkbox',
    options: [
      { value: 'chat_backup', label: 'Chats exported/backed up' },
      { value: 'timeline', label: 'Timeline evidence (photos/travel/tickets)' },
      { value: 'payments', label: 'Payment proofs (UPI/bank/receipts)' },
      { value: 'witness', label: 'Witnesses (trusted contacts)' },
    ],
  },
]

const WOMEN_QUESTIONS = [
  {
    id: 'stage',
    question: 'What is your relationship status?',
    type: 'radio',
    options: [
      { value: 'engaged', label: 'Engaged' },
      { value: 'married', label: 'Married' },
      { value: 'separated', label: 'Separated / Divorced' },
    ],
  },
  {
    id: 'signals',
    question: 'Which of these situations apply to you? (Select all that apply)',
    type: 'checkbox',
    options: [
      { value: 'dowry_demand', label: 'Dowry demand (current or past)' },
      { value: 'harassment', label: 'Harassment / threats / coercion' },
      { value: 'physical_violence', label: 'Physical violence' },
      { value: 'financial_control', label: 'Financial control / restriction' },
      { value: 'forced_out', label: 'Forced to leave home / abandoned' },
      { value: 'self_harm_threat', label: 'Self-harm threats by partner/family' },
    ],
  },
  {
    id: 'readiness',
    question: 'What evidence do you currently have? (Select all that apply)',
    type: 'checkbox',
    options: [
      { value: 'gifts', label: 'Gift list + photos/receipts' },
      { value: 'transfers', label: 'Transfers proof (UPI/bank)' },
      { value: 'messages', label: 'Messages/calls evidence saved' },
      { value: 'medical_police', label: 'Medical/police records (if any)' },
    ],
  },
]

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RiskCalculator({
  apiBaseUrl,
  onClose,
}: {
  apiBaseUrl?: string
  onClose: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [gender, setGender] = useState<Gender>('')
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({})
  const [finalManualInput, setFinalManualInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'loading') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, status])

  const questions = gender === 'male' ? MEN_QUESTIONS : WOMEN_QUESTIONS

  const handleEmailSubmit = () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      setEmailError('Email is required')
      return
    }
    if (!emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address')
      return
    }
    setEmailError('')
    setEmail(trimmed)
    setStep(2)
  }

  const handleAnswerChange = (questionId: string, value: string, isChecked?: boolean) => {
    const question = questions.find((q) => q.id === questionId)
    if (!question) return

    if (question.type === 'radio') {
      setAnswers({ ...answers, [questionId]: value })
    } else {
      const current = (answers[questionId] as string[]) || []
      if (isChecked) {
        setAnswers({ ...answers, [questionId]: [...current, value] })
      } else {
        setAnswers({ ...answers, [questionId]: current.filter((v) => v !== value) })
      }
    }
  }

  const canProceed = (stepNum: number) => {
    if (stepNum === 2) return gender !== ''
    if (stepNum === 3) return answers['stage'] !== undefined
    if (stepNum === 4) {
      const signals = answers['signals'] as string[]
      const readiness = answers['readiness'] as string[]
      return signals && signals.length > 0 && readiness !== undefined
    }
    return true
  }

  const handleSubmit = async () => {
    if (!canProceed(4)) {
      setErrorMessage('Please answer all questions')
      return
    }

    setStatus('loading')
    setErrorMessage('')

    try {
      const apiBase = apiBaseUrl || (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001'
      const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY

      // Combine all manual inputs into one string
      const allManualInputs = [
        ...Object.values(manualInputs).filter((v) => v.trim()),
        finalManualInput.trim(),
      ]
        .filter(Boolean)
        .join('\n\n')

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      
      // Add Supabase anon key if available (required for edge functions)
      if (supabaseAnonKey) {
        headers['Authorization'] = `Bearer ${supabaseAnonKey}`
        headers['apikey'] = supabaseAnonKey
      }

      const resp = await fetch(`${apiBase}/risk-check`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          gender,
          answers,
          manualInput: allManualInputs || undefined,
        }),
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => null)
        if (resp.status === 429) {
          setErrorMessage(data?.message || 'You have exceeded the limit. Please try again tomorrow.')
        } else {
          setErrorMessage(data?.error || 'Failed to generate risk check. Please try again.')
        }
        setStatus('error')
        return
      }

      const data = await resp.json()
      setAiResponse(data)
      setStatus('success')
      setStep(5)
    } catch (error) {
      console.error('Risk check error:', error)
      setErrorMessage('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 pt-6 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Safety & Documentation Check"
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-white/85">Blue Drum AI</div>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">Safety & Documentation Check</h2>
              <p className="mt-1 text-sm text-white/80">A quick self-check. Not legal advice.</p>
            </div>
            {status !== 'loading' && (
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[85vh] overflow-y-auto">
          {/* Step 1: Email */}
          {step === 1 && (
            <div className="px-4 py-6 sm:px-6 sm:py-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Start your check</h3>
                <p className="mt-2 text-sm text-gray-600">Enter your email to begin. We'll store your results securely.</p>
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEmailSubmit()
                  }}
                  className="input-field"
                  placeholder="you@example.com"
                  autoFocus
                />
                {emailError && <div className="mt-2 text-sm text-red-600">{emailError}</div>}
              </div>
              <button onClick={handleEmailSubmit} className="btn-primary mt-6 mb-6 w-full flex items-center justify-center gap-2">
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2: Gender */}
          {step === 2 && (
            <div className="px-4 py-6 sm:px-6 sm:py-8">
              <div className="mb-6">
                <div className="mb-2 text-sm text-gray-500">Step 1 of 4</div>
                <h3 className="text-xl font-bold text-gray-900">Which module applies to you?</h3>
              </div>
              <div className="grid gap-3">
                <button
                  onClick={() => {
                    setGender('male')
                    setStep(3)
                  }}
                  className="flex items-start gap-3 rounded-xl border-2 border-gray-200 p-4 text-left hover:border-primary-300 hover:bg-primary-50"
                >
                  <Shield className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Men's module</div>
                    <div className="mt-1 text-sm text-gray-600">Alimony, false cases, relationship disputes</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setGender('female')
                    setStep(3)
                  }}
                  className="flex items-start gap-3 rounded-xl border-2 border-gray-200 p-4 text-left hover:border-purple-300 hover:bg-purple-50"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-purple-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Women's module</div>
                    <div className="mt-1 text-sm text-gray-600">Dowry, domestic violence, maintenance rights</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Questions */}
          {step === 3 && (
            <div className="px-4 py-6 sm:px-6 sm:py-8">
              <div className="mb-6">
                <div className="mb-2 text-sm text-gray-500">Step 2 of 4</div>
                <h3 className="text-xl font-bold text-gray-900">Answer a few questions</h3>
                <p className="mt-1 text-sm text-gray-600">Be honest for the most accurate results.</p>
              </div>

              <div className="space-y-6">
                {questions.map((q) => (
                  <div key={q.id}>
                    <div className="mb-3 font-semibold text-gray-900">{q.question}</div>
                    <div className={q.type === 'radio' ? 'space-y-2' : 'space-y-2'}>
                      {q.options.map((opt) => {
                        const isSelected =
                          q.type === 'radio'
                            ? answers[q.id] === opt.value
                            : ((answers[q.id] as string[]) || []).includes(opt.value)
                        return (
                          <label
                            key={opt.value}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-colors ${
                              isSelected
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type={q.type}
                              checked={isSelected}
                              onChange={(e) =>
                                handleAnswerChange(q.id, opt.value, q.type === 'checkbox' ? e.target.checked : undefined)
                              }
                              className="mt-0.5"
                            />
                            <span className="text-sm text-gray-900">{opt.label}</span>
                          </label>
                        )
                      })}
                    </div>
                    {/* Manual input after each question */}
                    <div className="mt-3">
                      <textarea
                        value={manualInputs[q.id] || ''}
                        onChange={(e) => setManualInputs({ ...manualInputs, [q.id]: e.target.value })}
                        placeholder="Anything else about this? (optional)"
                        className="input-field min-h-[60px] text-sm"
                        maxLength={500}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  if (canProceed(3)) setStep(4)
                  else setErrorMessage('Please answer all questions')
                }}
                className="btn-primary mt-6 mb-6 w-full flex items-center justify-center gap-2"
                disabled={!canProceed(3)}
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              {errorMessage && <div className="mt-3 text-sm text-red-600">{errorMessage}</div>}
            </div>
          )}

          {/* Step 4: Final manual input */}
          {step === 4 && (
            <div className="px-4 py-6 sm:px-6 sm:py-8">
              <div className="mb-6">
                <div className="mb-2 text-sm text-gray-500">Step 3 of 4</div>
                <h3 className="text-xl font-bold text-gray-900">Tell us more (optional)</h3>
                <p className="mt-1 text-sm text-gray-600">Share any additional details that might be relevant.</p>
              </div>
              <textarea
                value={finalManualInput}
                onChange={(e) => setFinalManualInput(e.target.value)}
                placeholder="Describe your situation in detail..."
                className="input-field min-h-[120px]"
                maxLength={2000}
              />
              <div className="mt-2 text-xs text-gray-500">{finalManualInput.length} / 2000 characters</div>

              <button onClick={handleSubmit} className="btn-primary mt-6 mb-6 w-full flex items-center justify-center gap-2" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing your situation...</span>
                  </>
                ) : (
                  <>
                    <span>Get my personalized report</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              {errorMessage && <div className="mt-3 text-sm text-red-600">{errorMessage}</div>}
            </div>
          )}

          {/* Step 5: Results */}
          {step === 5 && aiResponse && (
            <div className="px-4 py-6 sm:px-6 sm:py-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Your Legal Shield Report</h3>
                <p className="mt-2 text-sm text-gray-600">Personalized insights based on your situation</p>
              </div>

              {/* Scores */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{aiResponse.riskScore}</div>
                  <div className="text-xs text-gray-600">Situation Risk</div>
                </div>
                <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{aiResponse.readinessScore}</div>
                  <div className="text-xs text-gray-600">Readiness Score</div>
                </div>
              </div>

              {/* Summary */}
              <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h4 className="mb-2 font-semibold text-gray-900">Summary</h4>
                <p className="text-sm leading-relaxed text-gray-700">{aiResponse.summary}</p>
              </div>

              {/* What to do now */}
              <div className="mb-6">
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <Shield className="h-5 w-5 text-primary-600" />
                  What to do now
                </h4>
                <ul className="space-y-2">
                  {aiResponse.whatToDoNow.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Relevant Laws */}
              {aiResponse.relevantLaws.length > 0 && (
                <div className="mb-6">
                  <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                    <Scale className="h-5 w-5 text-primary-600" />
                    Relevant Laws
                  </h4>
                  <div className="space-y-3">
                    {aiResponse.relevantLaws.map((law, idx) => (
                      <div key={idx} className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="font-semibold text-gray-900">{law.law}</div>
                        <div className="mt-1 text-sm text-gray-700">{law.relevance}</div>
                        {law.note && <div className="mt-2 text-xs text-gray-600 italic">{law.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Case Examples */}
              {aiResponse.caseExamples.length > 0 && (
                <div className="mb-6">
                  <h4 className="mb-3 font-semibold text-gray-900">Case Examples</h4>
                  <div className="space-y-3">
                    {aiResponse.caseExamples.map((example, idx) => (
                      <div key={idx} className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="font-semibold text-gray-900">{example.case}</div>
                        <div className="mt-1 text-sm text-gray-700">{example.relevance}</div>
                        <div className="mt-2 text-xs font-medium text-primary-600">Takeaway: {example.takeaway}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documentation Checklist */}
              <div className="mb-6">
                <h4 className="mb-3 font-semibold text-gray-900">Your Documentation Checklist</h4>
                <ul className="space-y-2">
                  {aiResponse.documentationChecklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="mt-0.5 h-4 w-4 shrink-0 rounded border border-gray-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Safety Note */}
              {aiResponse.safetyNote && (
                <div className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                    <div>
                      <div className="font-semibold text-red-900">Safety Resources</div>
                      <div className="mt-1 text-sm text-red-800">{aiResponse.safetyNote}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="rounded-xl border-2 border-primary-200 bg-primary-50 p-6 text-center">
                <h4 className="mb-2 font-semibold text-gray-900">Ready to build your full case file?</h4>
                <p className="mb-4 text-sm text-gray-600">Join the waitlist to unlock the complete vault and get reminders.</p>
                <button
                  onClick={() => {
                    // Could open waitlist form or redirect
                    window.location.href = '#waitlist'
                    onClose()
                  }}
                  className="btn-primary w-full"
                >
                  Join waitlist for early access
                </button>
              </div>

              <div className="mt-4 text-center text-xs text-gray-500">
                This is an information tool, not legal advice. Always consult a qualified lawyer.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
