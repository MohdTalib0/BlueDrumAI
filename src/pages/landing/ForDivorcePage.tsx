import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ChevronDown,
  Lock,
  Brain,
  FileText,
  Scale,
  TrendingUp,
  Gift,
  Shield,
  CheckCircle2,
} from 'lucide-react'
import { LandingNav } from '../../components/landing/LandingNav'
import SampleCasePreview from '../../components/SampleCasePreview'

const whoIsThisFor = [
  { title: 'Going through divorce or separation', desc: 'You need to organize months or years of conversations, financial records, and documents before your hearing.' },
  { title: 'Your lawyer asked for organized evidence', desc: 'They need a timeline, structured documents, and financial summaries - not a folder of screenshots.' },
  { title: 'Preparing for maintenance or alimony proceedings', desc: 'Court-format affidavits, income documentation, and expense tracking. Built for Indian law.' },
  { title: 'Documenting dowry or domestic incidents', desc: 'Gift records, incident logs, medical reports. Structured for legal proceedings.' },
]

const features = [
  {
    icon: Lock,
    title: 'Encrypted Evidence Vault',
    desc: 'Upload screenshots, documents, photos, and chat exports. Encrypted on your device before upload. Automatic timestamps and visual timeline.',
    detail: 'Everything is encrypted in your browser before it leaves your device. We cannot read your files. Build a chronological evidence timeline your lawyer can use. Supports WhatsApp, SMS, email, and more.',
    gradient: 'from-sky-400 to-blue-500',
    bg: 'bg-sky-50',
  },
  {
    icon: Brain,
    title: 'AI Chat Analysis',
    desc: 'Paste or upload conversations. AI identifies manipulation, gaslighting, financial threats, and key patterns. Risk score and highlighted moments.',
    detail: 'Our AI analyzes WhatsApp, SMS, and email conversations against Indian legal context. Get a risk score (0-100), categorized red flags, and a summary you can share with your lawyer. No manual reading required.',
    gradient: 'from-violet-400 to-purple-500',
    bg: 'bg-violet-50',
  },
  {
    icon: TrendingUp,
    title: 'Income & Expense Tracker',
    desc: 'Log financial records for maintenance. Court-format affidavits following Rajnesh v. Neha guidelines. One-click export.',
    detail: 'Designed for alimony and maintenance proceedings. Follows Supreme Court guidelines. Monthly income, expenses, disposable income calculations. Generate affidavits in the format judges expect.',
    gradient: 'from-teal-400 to-emerald-500',
    bg: 'bg-teal-50',
  },
  {
    icon: Gift,
    title: 'Dowry & DV Documentation',
    desc: 'Document gifts, transfers, and incidents. Witness management. Medical report organizer. Maintenance calculator.',
    detail: 'For women: Dowry Vault (gifts, cash, jewelry, property), DV Log (incidents with dates and evidence), Maintenance Calculator (Section 125 CrPC, Hindu Marriage Act, DV Act). All structured for legal use.',
    gradient: 'from-rose-400 to-pink-500',
    bg: 'bg-rose-50',
  },
  {
    icon: FileText,
    title: 'Court-Ready PDF Export',
    desc: 'One click: structured case file with evidence index, conversation analysis, financial summaries. What lawyers ask for.',
    detail: 'Export a comprehensive PDF with timeline, analysis summaries, and financial records. Admissible format. Your lawyer gets what they need, fast.',
    gradient: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50',
  },
]

export default function ForDivorcePage() {
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
            <Scale className="h-3.5 w-3.5" />
            For people navigating family disputes in India
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-800 dark:text-white sm:text-5xl md:text-6xl">
            Your evidence is everywhere.
            <br />
            <span className="bg-gradient-to-r from-sky-600 to-violet-600 bg-clip-text text-transparent">Your lawyer needs it in one place.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Organize chats, documents, and financial records into a structured case file. AI analyzes conversations. Court-ready PDFs in minutes. Built for Indian family law.
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

      {/* Who is this for */}
      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-slate-800 dark:text-white sm:text-3xl">Is this for you?</h2>
          <p className="mt-3 text-center text-slate-600 dark:text-slate-300">If you're in any of these situations, we built this for you.</p>

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
          <p className="mt-3 text-center text-slate-600 dark:text-slate-300">From scattered files to a structured case - in minutes.</p>

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
                  Built for Indian family law. We reference Section 498A IPC, Dowry Prohibition Act, Domestic Violence Act 2005, Section 125 CrPC, and Supreme Court guidelines like Rajnesh v. Neha (2020). Dedicated tools for men (income, affidavits, breakup drafting) and women (dowry vault, DV log, maintenance calculator).
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
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white sm:text-3xl">Get organized today</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Free plan. No credit card. Your lawyer will thank you.</p>
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
            <Link to="/for-couples" className="hover:text-slate-700">For Couples</Link>
            <a href="/#pricing" className="hover:text-slate-700">Pricing</a>
          </nav>
        </div>
      </footer>

      <SampleCasePreview open={showSample} onClose={() => setShowSample(false)} />
    </div>
  )
}
