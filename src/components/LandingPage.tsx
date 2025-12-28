import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Lock,
  Scale,
  Shield,
  Sparkles,
  Users,
  MessageSquare,
  GitCompare,
  BookOpen,
  Bot,
  Zap,
  Brain,
} from 'lucide-react'
import SignupForm from './SignupForm'
import RiskCalculator from './RiskCalculator'

type Feature = {
  title: string
  desc: string
  icon: ComponentType<{ className?: string }>
}

function SectionTitle({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {kicker ? (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2 text-xs font-semibold text-primary-700">
          <Sparkles className="h-4 w-4" />
          {kicker}
        </div>
      ) : null}
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{title}</h2>
      {subtitle ? <p className="mt-3 text-lg text-gray-600">{subtitle}</p> : null}
    </div>
  )
}

function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function LandingPage() {
  const [showForm, setShowForm] = useState(false)
  const [showRisk, setShowRisk] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const features: Feature[] = useMemo(
    () => [
      {
        title: 'Evidence vault',
        desc: 'Store key relationship documents, photos, and files with consistent timestamps and metadata.',
        icon: FileText,
      },
      {
        title: 'AI-assisted organization',
        desc: 'Turn messy screenshots and exports into a clean timeline and structured summary.',
        icon: Users,
      },
      {
        title: 'Privacy-first',
        desc: 'Designed for encrypted uploads and strict access control from day one.',
        icon: Lock,
      },
      {
        title: 'Lawyer-ready export',
        desc: 'Generate a readable PDF case file your lawyer can review quickly.',
        icon: Scale,
      },
      {
        title: 'Risk signals',
        desc: 'Spot unhealthy patterns and threats early, with suggested next steps.',
        icon: AlertTriangle,
      },
      {
        title: 'Fair outcomes focus',
        desc: 'The goal is truth and documentation—so disputes can be resolved fairly.',
        icon: Shield,
      },
    ],
    [],
  )

  const faqs = useMemo(
    () => [
      {
        q: 'Is this legal advice?',
        a: 'No. Blue Drum AI is a documentation and information tool. Always consult a qualified lawyer for legal advice.',
      },
      {
        q: 'Is my data private?',
        a: 'We build for privacy-first storage and encrypted uploads. You control what you store and what you export.',
      },
      {
        q: 'Who is this for?',
        a: 'Anyone who wants to document facts in a relationship—men and women—so disputes can be handled fairly.',
      },
      {
        q: 'When do we launch?',
        a: 'We’ll invite waitlist users in batches for private beta. Join the waitlist to get notified.',
      },
    ],
    [],
  )

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-x-0 -top-48 mx-auto h-[520px] max-w-6xl rounded-full bg-gradient-to-r from-blue-200/30 via-indigo-200/20 to-purple-200/30 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary-200/25 to-blue-200/25 blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/70 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 shadow-sm sm:h-10 sm:w-10">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-base font-bold text-gray-900 sm:text-lg">Blue Drum AI</div>
              <div className="hidden text-xs text-gray-500 sm:block">Evidence-based legal vigilance</div>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            <button onClick={() => scrollTo('features')} className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
              Features
            </button>
            <button onClick={() => scrollTo('how')} className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
              How it works
            </button>
            <button onClick={() => scrollTo('pricing')} className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
              Pricing
            </button>
            <button onClick={() => scrollTo('faq')} className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
              FAQ
            </button>
          </nav>

          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 sm:px-5 sm:py-3 sm:text-sm"
          >
            <span className="sm:hidden">Join waitlist</span>
            <span className="hidden sm:inline">Join waitlist</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2 text-sm font-semibold text-primary-700">
            <Sparkles className="h-4 w-4" />
            Private beta opening soon
          </div>

          <h1 className="text-5xl font-bold leading-tight text-gray-900 md:text-6xl">
            Document your truth.
            <span className="block bg-gradient-to-r from-primary-700 to-blue-700 bg-clip-text text-transparent">
              Protect your rights.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-xl leading-relaxed text-gray-600">
            Blue Drum AI helps Indian men and women organize evidence, identify risk signals, and export lawyer-ready case files.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={() => setShowForm(true)} className="btn-primary w-full flex items-center justify-center sm:w-auto">
              Join waitlist
            </button>
            <button onClick={() => scrollTo('how')} className="btn-secondary w-full flex items-center justify-center sm:w-auto">
              See how it works
            </button>
            <button 
              onClick={() => setShowRisk(true)} 
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-yellow-50 px-6 py-3 text-sm font-bold text-orange-700 shadow-md hover:from-orange-100 hover:to-yellow-100 transition-all sm:w-auto"
            >
              <AlertTriangle className="h-5 w-5" />
              Free Risk Check
            </button>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { label: 'Built for clarity', value: 'Evidence timeline', icon: FileText },
              { label: 'Built for privacy', value: 'Encrypted design', icon: Lock },
              { label: 'Built for fairness', value: 'Men + women', icon: Users },
            ].map((s, idx) => (
              <Card key={idx} className="p-6 text-left">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-500">{s.label}</div>
                    <div className="mt-1 text-xl font-bold text-gray-900">{s.value}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Risk Check Quick Access */}
          <div className="mx-auto mt-12 max-w-2xl">
            <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 p-6 text-center">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-gray-900">Try Our Free Risk Check</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Get instant AI-powered insights on your legal readiness—no signup required.
                  </p>
                </div>
                <button
                  onClick={() => setShowRisk(true)}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 px-6 py-3 font-bold text-white shadow-md hover:from-orange-700 hover:to-red-700 transition-all transform hover:scale-105"
                >
                  <AlertTriangle className="h-5 w-5" />
                  Start Now
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Risk Check CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl border-2 border-orange-200 bg-white p-8 shadow-xl md:p-12">
              <div className="text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-100 to-yellow-100 px-6 py-2 text-sm font-bold text-orange-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Try it now - No signup required</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
                  Check Your Legal Readiness
                  <span className="block mt-2 text-2xl md:text-3xl text-orange-600">
                    Free AI-Powered Risk Assessment
                  </span>
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
                  Answer a few questions about your situation and get instant AI-powered insights on your legal readiness, risk factors, and what evidence you should collect.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <button
                    onClick={() => setShowRisk(true)}
                    className="group w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 px-8 py-4 text-lg font-bold text-white shadow-lg hover:from-orange-700 hover:to-red-700 transition-all transform hover:scale-105 sm:w-auto"
                  >
                    <AlertTriangle className="h-6 w-6" />
                    Start Free Risk Check
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>No signup required • Takes 2 minutes • Instant results</span>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    { icon: Shield, text: 'AI-Powered Analysis' },
                    { icon: Scale, text: 'Legal Readiness Score' },
                    { icon: FileText, text: 'Actionable Recommendations' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 rounded-lg bg-gray-50 p-4">
                      <item.icon className="h-6 w-6 text-orange-600" />
                      <span className="text-sm font-semibold text-gray-700">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Red Flag Radar - Unique Feature Highlight */}
      <section className="relative overflow-hidden bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            {/* Badge */}
            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-6 py-3 text-sm font-bold text-red-800 shadow-sm">
                <Zap className="h-5 w-5" />
                <span>Most Advanced Feature</span>
              </div>
            </div>

            {/* Main Title */}
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-900 md:text-5xl">
                Red Flag Radar
                <span className="block mt-2 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  AI-Powered Protection
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-xl text-gray-700">
                The only platform that uses advanced AI to analyze conversations, detect manipulation patterns, and help you learn to recognize red flags—before it's too late.
              </p>
            </div>

            {/* Unique Features Grid */}
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* AI-Powered Analysis */}
              <Card className="relative overflow-hidden border-2 border-red-200 bg-white p-6 shadow-lg">
                <div className="absolute top-0 right-0 rounded-bl-lg bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                  AI-Powered
                </div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-md">
                  <Brain className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Advanced AI Analysis</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Not just keyword matching. Our AI understands context, detects manipulation patterns, and identifies subtle red flags that humans might miss.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Context-aware pattern detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Risk scoring (0-100) with breakdown</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Actionable recommendations</span>
                  </li>
                </ul>
              </Card>

              {/* Multi-Platform Support */}
              <Card className="relative overflow-hidden border-2 border-blue-200 bg-white p-6 shadow-lg">
                <div className="absolute top-0 right-0 rounded-bl-lg bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  Universal
                </div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Multi-Platform Support</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Works with WhatsApp, SMS, Email, or manual text input. Our universal parser handles any chat format automatically.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>WhatsApp export (.txt)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>SMS backups (.csv)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Email threads (.eml)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Manual text paste</span>
                  </li>
                </ul>
              </Card>

              {/* AI Comparison */}
              <Card className="relative overflow-hidden border-2 border-purple-200 bg-white p-6 shadow-lg">
                <div className="absolute top-0 right-0 rounded-bl-lg bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                  Exclusive
                </div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md">
                  <GitCompare className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">AI-Powered Comparison</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Compare multiple chat analyses side-by-side. AI detects trends, escalation patterns, and provides comparative insights—unique to Blue Drum AI.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Trend analysis over time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Escalation detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Common pattern identification</span>
                  </li>
                </ul>
              </Card>

              {/* Interactive Learning */}
              <Card className="relative overflow-hidden border-2 border-green-200 bg-white p-6 shadow-lg">
                <div className="absolute top-0 right-0 rounded-bl-lg bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  Educational
                </div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-md">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Red Flag Experience</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Learn to recognize red flags through AI-powered interactive conversations. Practice identifying manipulation in a safe environment.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>AI simulates manipulative behavior</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Real-time red flag detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Educational notes and lessons</span>
                  </li>
                </ul>
              </Card>

              {/* Demo Red Flag */}
              <Card className="relative overflow-hidden border-2 border-pink-200 bg-white p-6 shadow-lg">
                <div className="absolute top-0 right-0 rounded-bl-lg bg-pink-100 px-3 py-1 text-xs font-bold text-pink-700">
                  For Women
                </div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Demo Red Flag Chat</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Chat with an AI that demonstrates red flag behaviors. Experience manipulation patterns firsthand to build recognition skills.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Interactive AI conversations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Adaptive responses based on your input</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Safe learning environment</span>
                  </li>
                </ul>
              </Card>

              {/* Real-time Detection */}
              <Card className="relative overflow-hidden border-2 border-orange-200 bg-white p-6 shadow-lg">
                <div className="absolute top-0 right-0 rounded-bl-lg bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                  Real-time
                </div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Instant Insights</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Get immediate analysis with detailed breakdowns. See red flags, patterns, and recommendations as soon as you upload.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Detailed risk breakdown</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>Pattern examples with quotes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    <span>PDF export for lawyers</span>
                  </li>
                </ul>
              </Card>
            </div>

            {/* CTA */}
            <div className="mt-12 text-center">
              <p className="text-lg font-semibold text-gray-700 mb-4">
                Ready to protect yourself with AI-powered analysis?
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-8 py-4 text-lg font-bold text-white shadow-lg hover:from-red-700 hover:to-orange-700 transition-all transform hover:scale-105"
              >
                <Sparkles className="h-5 w-5" />
                Join Waitlist for Early Access
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-16">
        <SectionTitle
          kicker="Designed for real-world disputes"
          title="Everything you need to stay prepared"
          subtitle="Secure documentation, clear organization, and exports that lawyers actually want."
        />

        <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{f.title}</div>
                  <div className="mt-2 text-sm leading-relaxed text-gray-600">{f.desc}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white py-16">
        <div className="container mx-auto px-4">
          <SectionTitle title="How it works" subtitle="Three steps. Clean output. Stronger preparedness." />

          <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Upload & document',
                desc: 'Add files, notes, and exports as they happen. Keep the record consistent.',
              },
              {
                step: '02',
                title: 'Organize & analyze',
                desc: 'We help structure evidence into a timeline and highlight key risk signals.',
              },
              {
                step: '03',
                title: 'Export & share',
                desc: 'Generate a lawyer-ready PDF so your case file is readable in minutes.',
              },
            ].map((s) => (
              <Card key={s.step} className="p-6">
                <div className="text-sm font-bold text-primary-700">{s.step}</div>
                <div className="mt-2 text-xl font-bold text-gray-900">{s.title}</div>
                <div className="mt-3 text-sm leading-relaxed text-gray-600">{s.desc}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="container mx-auto px-4 py-16">
        <SectionTitle title="Two modules, one mission" subtitle="Truth and evidence—so outcomes are fair." />

        <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Shield className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold text-gray-900">For men</div>
            </div>
            <p className="mt-3 text-gray-600">Evidence capture + expense clarity + organized exports.</p>
            <ul className="mt-6 space-y-3 text-gray-700">
              {[
                'Consent/evidence vault and timeline',
                'Income + expenses tracker (for clarity)',
                'Chat export organization and risk signals',
                'Lawyer-ready case file export',
              ].map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold text-gray-900">For women</div>
            </div>
            <p className="mt-3 text-gray-600">Dowry/DV documentation + structured incident logs.</p>
            <ul className="mt-6 space-y-3 text-gray-700">
              {[
                'Dowry documentation (gifts, receipts, transfers)',
                'Incident log with attachments and notes',
                'Organized evidence timeline',
                'Lawyer-ready case file export',
              ].map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* Use cases */}
      <section id="usecases" className="bg-white py-16">
        <div className="container mx-auto px-4">
          <SectionTitle title="Use cases" subtitle="Practical scenarios where documentation changes outcomes." />

          <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
            {[
              {
                title: 'Dating & live-in documentation',
                desc: 'Maintain a factual timeline that can support consensual relationship history.',
              },
              {
                title: 'Alimony & maintenance clarity',
                desc: 'Track legitimate expenses and keep records organized for faster review.',
              },
              {
                title: 'Dowry documentation',
                desc: 'Record gifts, receipts, transfers, and demands in one structured place.',
              },
              {
                title: 'Domestic violence incident log',
                desc: 'Maintain timestamped notes and evidence attachments for safer escalation.',
              },
            ].map((u) => (
              <Card key={u.title} className="p-6">
                <div className="text-xl font-bold text-gray-900">{u.title}</div>
                <div className="mt-2 text-sm leading-relaxed text-gray-600">{u.desc}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For lawyers */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
              <div className="p-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2 text-xs font-semibold text-primary-700">
                  <Scale className="h-4 w-4" />
                  Lawyer-friendly
                </div>
                <h3 className="mt-4 text-2xl font-bold text-gray-900">Clean case files in one click</h3>
                <p className="mt-3 text-gray-600">
                  Lawyers hate scattered screenshots. Export a structured PDF with timeline, labels, and summaries.
                </p>
                <ul className="mt-6 space-y-3 text-gray-700">
                  {[
                    'Timeline + evidence index',
                    'Metadata and notes included',
                    'Chat export summaries',
                    'Download and share securely',
                  ].map((x) => (
                    <li key={x} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    Join waitlist
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-8 text-white">
                <div className="text-sm font-semibold text-white/80">What you get</div>
                <div className="mt-2 text-3xl font-bold">Readable in 5 minutes</div>
                <div className="mt-4 text-white/80">
                  A standardized case file format that reduces lawyer time and increases your confidence.
                </div>
                <div className="mt-8 grid grid-cols-1 gap-3">
                  {[
                    { k: 'Sections', v: 'Timeline, files, summaries' },
                    { k: 'Format', v: 'PDF export' },
                    { k: 'Goal', v: 'Clarity and fairness' },
                  ].map((r) => (
                    <div key={r.k} className="rounded-xl bg-white/10 p-4">
                      <div className="text-xs text-white/70">{r.k}</div>
                      <div className="mt-1 font-semibold">{r.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white py-16">
        <div className="container mx-auto px-4">
          <SectionTitle title="Pricing" subtitle="Start free. Upgrade when you need more." />

          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="p-8">
              <div className="text-sm font-semibold text-gray-500">Free</div>
              <div className="mt-2 text-4xl font-bold text-gray-900">₹0</div>
              <div className="mt-1 text-sm text-gray-600">Basic documentation and early access updates.</div>
              <ul className="mt-6 space-y-3 text-gray-700">
                {['Limited evidence uploads', 'Basic structure', 'Email updates'].map((x) => (
                  <li key={x} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <button onClick={() => setShowForm(true)} className="btn-secondary w-full flex items-center justify-center">
                  Join waitlist
                </button>
              </div>
            </Card>

            <Card className="p-8 ring-1 ring-primary-200">
              <div className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
                Recommended
              </div>
              <div className="mt-3 text-sm font-semibold text-gray-500">Premium (planned)</div>
              <div className="mt-2 text-4xl font-bold text-gray-900">₹199</div>
              <div className="mt-1 text-sm text-gray-600">Per month. Includes export and advanced organization.</div>
              <ul className="mt-6 space-y-3 text-gray-700">
                {['Unlimited evidence vault', 'Advanced organization', 'Lawyer-ready PDF export'].map((x) => (
                  <li key={x} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <button onClick={() => setShowForm(true)} className="btn-primary w-full flex items-center justify-center">
                  Get early access
                </button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-16">
        <SectionTitle title="FAQ" subtitle="Quick answers before you join the waitlist." />

        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {faqs.map((f, idx) => {
            const isOpen = openFaq === idx
            return (
              <Card key={f.q} className="overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                >
                  <div className="text-base font-semibold text-gray-900">{f.q}</div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-700">
                    {isOpen ? '−' : '+'}
                  </div>
                </button>
                {isOpen ? <div className="px-6 pb-6 text-sm leading-relaxed text-gray-600">{f.a}</div> : null}
              </Card>
            )
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 pb-16">
        <div className="mx-auto max-w-6xl rounded-3xl bg-gradient-to-r from-primary-600 to-primary-700 p-10 text-center text-white md:p-14">
          <h3 className="text-3xl font-bold md:text-4xl">Get early access to Blue Drum AI</h3>
          <p className="mx-auto mt-3 max-w-2xl text-white/85">
            Join the waitlist to receive private beta access and launch updates.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={() => setShowForm(true)} className="rounded-xl bg-white px-8 py-4 font-semibold text-primary-700 shadow-sm hover:bg-gray-100">
              Join waitlist
            </button>
            <button onClick={() => scrollTo('features')} className="rounded-xl border border-white/30 px-8 py-4 font-semibold text-white hover:bg-white/10">
              Explore features
            </button>
          </div>
          <div className="mt-6 text-xs text-white/70">This is an information tool, not legal advice.</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/60">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">Blue Drum AI</div>
                <div className="text-sm text-gray-600">Truth. Evidence. Fair outcomes.</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <button onClick={() => scrollTo('features')} className="hover:text-gray-900">
                Features
              </button>
              <button onClick={() => scrollTo('how')} className="hover:text-gray-900">
                How it works
              </button>
              <button onClick={() => scrollTo('pricing')} className="hover:text-gray-900">
                Pricing
              </button>
              <button onClick={() => scrollTo('faq')} className="hover:text-gray-900">
                FAQ
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-gray-200 pt-6 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
            <div>© {new Date().getFullYear()} Blue Drum AI. All rights reserved.</div>
            <div>Not legal advice. For information and documentation only.</div>
          </div>
        </div>
      </footer>

      {showForm ? <SignupForm onClose={() => setShowForm(false)} /> : null}
      {showRisk ? <RiskCalculator onClose={() => setShowRisk(false)} /> : null}

      {/* Blue Drum bubble - Enhanced */}
      <button
        type="button"
        onClick={() => setShowRisk(true)}
        className="group fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 shadow-2xl ring-4 ring-orange-200/50 hover:shadow-2xl hover:ring-orange-300/70 transition-all transform hover:scale-110 animate-pulse sm:px-6 sm:py-4"
        aria-label="Open safety & documentation check"
      >
        <div className="relative">
          <img src="/drum.svg" alt="Blue Drum risk check" className="h-10 w-10 sm:h-12 sm:w-12 bd-drum-animate filter brightness-0 invert" />
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-orange-600 shadow-md">
            !
          </div>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-sm font-bold text-white sm:text-base">Free Risk Check</span>
          <span className="text-xs text-white/90">Try it now</span>
        </div>
        <ArrowRight className="h-5 w-5 text-white group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  )
}

export default LandingPage

