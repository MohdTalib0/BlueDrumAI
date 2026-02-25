import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ChevronDown,
  Lock,
  Brain,
  FileText,
  Shield,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { LandingNav } from '../../components/landing/LandingNav'
import SampleCasePreview from '../../components/SampleCasePreview'

const whoIsThisFor = [
  { title: 'Dating and want to be prepared', desc: 'Start documenting gifts, important conversations, and receipts. Peace of mind without paranoia.' },
  { title: 'Live-in relationship', desc: 'Document your shared life - transfers, agreements, and key moments. Built for Indian legal context.' },
  { title: "Things aren't great", desc: "You're not ready to leave yet, but you want your ducks in a row. Document now, decide later." },
  { title: "You've seen messy breakups", desc: "Friends or family went through chaos. You're not taking that risk." },
]

const features = [
  {
    icon: Brain,
    title: 'Red Flag Radar',
    desc: 'AI analyzes your WhatsApp, SMS, or email conversations. Spots manipulation, gaslighting, and financial threats in seconds.',
    detail: 'Paste or upload any chat. Our AI identifies patterns you might miss - contradictions, intimidation, isolation tactics. Get a risk score and highlighted moments. No legal expertise needed.',
    gradient: 'from-violet-400 to-purple-500',
    bg: 'bg-violet-50',
  },
  {
    icon: Lock,
    title: 'Encrypted Evidence Vault',
    desc: 'Store screenshots, documents, and receipts. Encrypted on your device before upload - we never see your files.',
    detail: 'Everything gets automatic timestamps and a visual timeline. When you need it, export a structured case file. Your data stays yours.',
    gradient: 'from-sky-400 to-blue-500',
    bg: 'bg-sky-50',
  },
  {
    icon: FileText,
    title: 'Court-Ready Export',
    desc: 'One click: structured PDF with evidence index, timelines, and summaries. What lawyers actually ask for.',
    detail: 'Indian family law context built in. Formats that hold up. No spreadsheets, no chaos.',
    gradient: 'from-teal-400 to-emerald-500',
    bg: 'bg-teal-50',
  },
]

export default function ForCouplesPage() {
  const [expandedCard, setExpandedCard] = useState<number | null>(null)
  const [showSample, setShowSample] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-violet-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 antialiased">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-20 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-100/80 via-violet-50/50 to-transparent blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-gradient-to-tl from-teal-100/60 to-transparent blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-100/90 px-4 py-2 text-xs font-semibold text-sky-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            For couples who want to be prepared
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-800 dark:text-white sm:text-5xl md:text-6xl">
            Be prepared,
            <br />
            <span className="bg-gradient-to-r from-sky-600 to-violet-600 bg-clip-text text-transparent">not blindsided.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Document your relationship, organize your evidence, and know what you have. If things ever go left, you're ready. No lawyer needed to get started.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/sign-up"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-sky-600/25 transition-all hover:bg-sky-700 hover:shadow-xl sm:w-auto"
            >
              Get Started Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              onClick={() => setShowSample(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 dark:border-sky-700 bg-white dark:bg-slate-800 px-8 py-4 text-base font-semibold text-sky-700 dark:text-sky-300 shadow-sm transition-all hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700 sm:w-auto"
            >
              <FileText className="h-4 w-4" />
              See a Sample Case File
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-500">Free plan available - no credit card needed</p>
        </div>
      </section>

      {/* Who is this for - Collapsible cards */}
      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-slate-800 dark:text-white sm:text-3xl">Is this for you?</h2>
          <p className="mt-3 text-center text-slate-600 dark:text-slate-300">If any of these sound like you, you're in the right place.</p>

          <div className="mt-10 space-y-3">
            {whoIsThisFor.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 p-5 shadow-sm transition-all hover:border-sky-200 dark:hover:border-sky-700 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.desc}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Expandable cards */}
      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-slate-800 dark:text-white sm:text-3xl">What you can do</h2>
          <p className="mt-3 text-center text-slate-600 dark:text-slate-300">Simple tools. Serious protection. Built for India.</p>

          <div className="mt-12 space-y-4">
            {features.map((f, i) => (
              <div
                key={i}
                className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                  expandedCard === i
                    ? 'border-sky-300 dark:border-sky-600 bg-white dark:bg-slate-800 shadow-lg shadow-sky-100 dark:shadow-sky-900/20'
                    : 'border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 hover:border-sky-200 dark:hover:border-sky-700'
                }`}
              >
                <button
                  onClick={() => setExpandedCard(expandedCard === i ? null : i)}
                  className="flex w-full items-center gap-4 p-6 text-left"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} shadow-md`}>
                    <f.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 dark:text-white">{f.title}</h3>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{f.desc}</p>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${expandedCard === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedCard === i && (
                  <div className="border-t border-slate-100 dark:border-slate-700 px-6 pb-6 pt-2">
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{f.detail}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / Legal credibility */}
      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-700 bg-gradient-to-br from-white to-sky-50/30 dark:from-slate-800 dark:to-slate-900 p-8 shadow-sm sm:p-12">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/50">
                <Shield className="h-8 w-8 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">India-first legal context</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  Built for Indian family law. We reference Section 498A, Dowry Prohibition Act, Domestic Violence Act, and Supreme Court guidelines like Rajnesh v. Neha. Your documentation is structured the way courts expect.
                </p>
                <p className="mt-3 text-sm font-medium text-slate-500">
                  Blue Drum AI is a documentation tool - not legal advice. Always consult a qualified lawyer for your specific situation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white sm:text-3xl">Start documenting today</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Free plan. No credit card. Your future self will thank you.</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/sign-up"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-sky-700 sm:w-auto"
            >
              Get Started Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/" className="text-sm font-medium text-sky-600 hover:text-sky-700">
              Back to home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 px-5 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Blue Drum AI" className="h-6 w-6" />
            <span className="text-sm font-semibold text-slate-700">Blue Drum AI</span>
          </div>
          <nav className="flex gap-6 text-sm text-slate-500">
            <Link to="/" className="hover:text-slate-700">Home</Link>
            <Link to="/for-divorce" className="hover:text-slate-700">For Divorce</Link>
            <a href="/#pricing" className="hover:text-slate-700">Pricing</a>
          </nav>
        </div>
      </footer>

      <SampleCasePreview open={showSample} onClose={() => setShowSample(false)} />
    </div>
  )
}
