import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Info, Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  redFlagsDetected?: Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
    description: string
  }>
  educationalNote?: string
}

interface Scenario {
  id: string
  type: 'guilt_trip' | 'isolation' | 'gaslighting' | 'financial_control' | 'general'
  title: string
  description: string
  initialMessage: string
  redFlags: string[]
  explanation: string
  lesson: string
}

const scenarios: Scenario[] = [
  {
    id: '1',
    type: 'guilt_trip',
    title: 'The Guilt Trip',
    description: 'Experience how manipulation through guilt works',
    initialMessage: "Hey, I noticed you didn't reply to my messages yesterday. I was really worried.",
    redFlags: ['Emotional manipulation', 'Guilt tripping', 'Invalidation of your priorities'],
    explanation:
      'This person is using guilt to make you feel bad about having other priorities. They\'re making you feel responsible for their emotions.',
    lesson:
      'Healthy relationships respect boundaries and understand that people have multiple priorities. You shouldn\'t feel guilty for having a life outside the relationship.',
  },
  {
    id: '2',
    type: 'isolation',
    title: 'The Isolation Attempt',
    description: 'See how someone tries to isolate you from friends and family',
    initialMessage: 'Are you going to that party with your friends this weekend?',
    redFlags: ['Isolation attempts', 'Undermining your relationships', 'Controlling behavior'],
    explanation:
      'This person is trying to isolate you from your support network. They want you to depend only on them.',
    lesson:
      'Healthy relationships encourage you to maintain friendships and family connections. Isolation is a major red flag.',
  },
  {
    id: '3',
    type: 'gaslighting',
    title: 'The Gaslighter',
    description: 'Experience gaslighting and blame-shifting',
    initialMessage: "I felt hurt when you said that about my appearance yesterday.",
    redFlags: ['Gaslighting', 'Blame shifting', 'Invalidation of feelings', 'Making you doubt yourself'],
    explanation:
      'This person is gaslighting you - making you doubt your own memory and feelings. They\'re shifting blame to make you feel like you\'re the problem.',
    lesson:
      'Your feelings and memories are valid. If someone consistently makes you doubt yourself, that\'s a major red flag. Trust your instincts.',
  },
  {
    id: '4',
    type: 'financial_control',
    title: 'The Financial Controller',
    description: 'Learn about financial manipulation and control',
    initialMessage: 'I saw you bought that dress. Was it really necessary?',
    redFlags: ['Financial control', 'Undermining your decisions', 'Manipulation through "we" language'],
    explanation:
      'This person is trying to control your finances and make decisions for you. They\'re using "we" language to make it seem like it\'s for your benefit.',
    lesson:
      'You have the right to make your own financial decisions. Financial control is a form of abuse. Healthy partners discuss finances, not control them.',
  },
]

export default function RedFlagExperience() {
  const { sessionToken } = useAuth()
  const navigate = useNavigate()
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario)
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: scenario.initialMessage,
        timestamp: new Date(),
      },
    ])
    setShowExplanation(false)
    setInput('')
  }

  const handleSend = async () => {
    if (!input.trim() || sending || !selectedScenario) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setSending(true)

    try {
      if (!sessionToken) {
        throw new Error('Not authenticated')
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      const response = await fetch(`${apiBase}/api/analyze/red-flag-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          scenarioType: selectedScenario.type,
          conversationHistory: messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
          userMessage: input.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get AI response')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        redFlagsDetected: data.redFlagsDetected,
        educationalNote: data.educationalNote,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: any) {
      console.error('Error getting AI response:', err)
      // Fallback response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I don't understand why you're being like this. I thought we were on the same page.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const resetExperience = () => {
    setSelectedScenario(null)
    setMessages([])
    setShowExplanation(false)
    setInput('')
  }

  const showLesson = () => {
    setShowExplanation(true)
  }

  if (selectedScenario && showExplanation) {
    return (
      <DashboardLayout
        title="Red Flag Experience"
        subtitle="Learn to recognize red flags through interactive scenarios"
      >
        <div className="w-full">
          {/* Explanation */}
          <div className="mb-6 space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-red-900">
                <AlertTriangle className="h-5 w-5" />
                Red Flags Detected
              </h3>
              <ul className="space-y-2">
                {selectedScenario.redFlags.map((flag, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-red-800">
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h3 className="mb-3 text-lg font-semibold text-blue-900">What Happened?</h3>
              <p className="text-sm leading-relaxed text-blue-800">{selectedScenario.explanation}</p>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 p-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-green-900">
                <CheckCircle2 className="h-5 w-5" />
                Key Lesson
              </h3>
              <p className="text-sm leading-relaxed text-green-800">{selectedScenario.lesson}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={resetExperience}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Try Another Scenario
            </button>
            <button
              onClick={() => navigate('/dashboard/red-flag-radar')}
              className="flex-1 rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              Back to Red Flag Radar
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (selectedScenario) {
    return (
      <DashboardLayout
        title="Red Flag Experience"
        subtitle="Learn to recognize red flags through interactive scenarios"
      >
        <div className="w-full">
          {/* Scenario Info */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedScenario.title}</h2>
                <p className="mt-1 text-sm text-gray-600">{selectedScenario.description}</p>
              </div>
              <button
                onClick={showLesson}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                See Explanation
              </button>
            </div>
          </div>

          {/* Chat Container */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
            {/* Chat Header */}
            <div className="border-b border-gray-200 bg-red-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <Bot className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI Red Flag Simulator</h3>
                  <p className="text-xs text-gray-600">Powered by AI - Educational tool</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="h-[500px] overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                      <Bot className="h-4 w-4 text-red-600" />
                    </div>
                  )}
                  <div className="flex-1 max-w-[80%]">
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-red-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p className={`mt-1 text-xs ${message.role === 'user' ? 'text-primary-100' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {message.redFlagsDetected && message.redFlagsDetected.length > 0 && (
                      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2">
                        <div className="text-xs font-semibold text-red-800 mb-1">Red Flags Detected:</div>
                        {message.redFlagsDetected.map((flag, idx) => (
                          <div key={idx} className="text-xs text-red-700">
                            • {flag.type} ({flag.severity})
                          </div>
                        ))}
                      </div>
                    )}
                    {message.educationalNote && (
                      <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
                        <div className="text-xs font-semibold text-blue-800 mb-1">💡 Educational Note:</div>
                        <div className="text-xs text-blue-700">{message.educationalNote}</div>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100">
                      <User className="h-4 w-4 text-primary-600" />
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex gap-3 justify-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <Bot className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="bg-white border border-red-200 rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your response..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                💡 Try responses like: "I'm busy with work", "I need some space", "I can't afford that", "No, I can't do that"
              </p>
            </div>
          </div>

          {/* Back Button */}
          <button
            onClick={resetExperience}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Choose Different Scenario
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Red Flag Experience"
      subtitle="Learn to recognize red flags through interactive AI-powered scenarios"
    >
      <div className="w-full">
        {/* Info Banner */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900">AI-Powered Interactive Learning</h3>
              <p className="mt-1 text-sm text-blue-800">
                Experience simulated conversations with red flag behaviors powered by AI. Learn to recognize manipulation,
                gaslighting, and controlling patterns in a safe, educational environment. The AI will adapt its responses
                based on your messages, making each conversation unique and realistic.
              </p>
            </div>
          </div>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
              onClick={() => startScenario(scenario)}
            >
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">{scenario.title}</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">{scenario.description}</p>
              <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Opening Message:</p>
                <p className="text-sm text-gray-700 italic">"{scenario.initialMessage}"</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {scenario.redFlags.slice(0, 2).map((flag, index) => (
                    <span key={index} className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                      {flag}
                    </span>
                  ))}
                  {scenario.redFlags.length > 2 && (
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                      +{scenario.redFlags.length - 2} more
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-primary-600 font-semibold">
                  Start Chat
                  <Send className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/dashboard/red-flag-radar')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Red Flag Radar
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
