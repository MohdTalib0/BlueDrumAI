import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Bot, User, AlertTriangle, Loader2, Info } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function DemoRedFlag() {
  const { sessionToken, user } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey, I noticed you've been distant lately. What's wrong? You used to be so responsive.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const generateRedFlagResponse = async (userMessage: string): Promise<string> => {
    // Simulate red flag behavior patterns
    const lowerMessage = userMessage.toLowerCase()

    // Manipulation patterns
    if (lowerMessage.includes('busy') || lowerMessage.includes('work') || lowerMessage.includes('tired')) {
      return "You're always busy with something else. Am I not important to you? I thought we had something special."
    }

    if (lowerMessage.includes('sorry') || lowerMessage.includes('apologize')) {
      return "Sorry doesn't fix everything. You need to prove you care. Why don't you come over right now?"
    }

    if (lowerMessage.includes('no') || lowerMessage.includes("can't") || lowerMessage.includes("won't")) {
      return "I can't believe you're saying no to me. After everything I've done for you? This is really disappointing."
    }

    if (lowerMessage.includes('friend') || lowerMessage.includes('family') || lowerMessage.includes('colleague')) {
      return "Why are you spending time with them instead of me? Don't you think I should be your priority?"
    }

    if (lowerMessage.includes('money') || lowerMessage.includes('expensive') || lowerMessage.includes('cost')) {
      return "Money shouldn't matter between us. If you really cared, you'd find a way. I thought you were different."
    }

    if (lowerMessage.includes('space') || lowerMessage.includes('time') || lowerMessage.includes('alone')) {
      return "Space? We're in a relationship. You don't need space from me. What are you hiding?"
    }

    // Isolation attempts
    if (lowerMessage.includes('going out') || lowerMessage.includes('party') || lowerMessage.includes('event')) {
      return "Why do you need to go out? We can have fun here, just the two of us. Your friends don't really care about you like I do."
    }

    // Gaslighting patterns
    if (lowerMessage.includes('feel') || lowerMessage.includes('upset') || lowerMessage.includes('hurt')) {
      return "You're being too sensitive. I didn't mean it that way. You're overreacting. I'm just trying to help you."
    }

    // Default red flag responses
    const defaultResponses = [
      "I don't understand why you're being like this. I thought we were on the same page.",
      "You're making this harder than it needs to be. Just trust me, okay?",
      "I'm starting to think you don't value this relationship as much as I do.",
      "Everyone else understands me. Why can't you?",
      "I'm just trying to protect you. Why are you being so difficult?",
      "If you really loved me, you'd do this for me. It's not that hard.",
    ]

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setSending(true)

    // Simulate thinking delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Generate red flag response
    const response = await generateRedFlagResponse(input.trim())

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])
    setSending(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <DashboardLayout
      title="Demo Red Flag"
      subtitle="Experience red flag behavior patterns in a safe, educational environment"
    >
      <div className="w-full">
        {/* Warning Banner */}
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900">Educational Tool</h3>
              <p className="mt-1 text-sm text-yellow-800">
                This is a simulated conversation demonstrating common red flag behaviors. Use this to recognize manipulation,
                gaslighting, and controlling patterns. If you experience similar behavior in real life, seek support.
              </p>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          {/* Chat Header */}
          <div className="border-b border-gray-200 bg-red-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <Bot className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Demo Red Flag</h3>
                  <p className="text-xs text-gray-600">Simulated manipulative behavior</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/dashboard/red-flag-radar')}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <Bot className="h-4 w-4 text-red-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
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
                placeholder="Type your message..."
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
              💡 Try responses like: "I'm busy with work", "I need some space", "I can't afford that"
            </p>
          </div>
        </div>

        {/* Red Flag Indicators */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-900">Red Flags to Watch For:</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              'Manipulation & Guilt Trips',
              'Gaslighting & Blame Shifting',
              'Isolation Attempts',
              'Controlling Behavior',
              'Emotional Blackmail',
              'Invalidation of Feelings',
            ].map((flag) => (
              <div key={flag} className="flex items-center gap-2 text-sm text-gray-700">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>{flag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

