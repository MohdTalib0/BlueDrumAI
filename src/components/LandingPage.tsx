import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Lock,
  Scale,
  Shield,
  TrendingUp,
  Users,
  MessageSquare,
  Brain,
  Eye,
  Upload,
  BarChart3,
  Download,
  Fingerprint,
  Server,
  KeyRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/* ═══════════════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════════════ */

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    document.querySelectorAll('.fade-in-up').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

/* ═══════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide ${className}`}>
      {children}
    </span>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-sm font-bold uppercase tracking-[0.15em] text-primary-500">{children}</p>
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useScrollReveal()

  const scrollTo = useCallback((id: string) => {
    setMobileMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'How it works', id: 'how-it-works' },
    { label: 'Security', id: 'security' },
    { label: 'Pricing', id: 'pricing' },
  ]

  const features = [
    { icon: Lock,           title: 'Encrypted Evidence Vault',  desc: 'AES-256 client-side encryption with SHA-256 hashing. Files never leave your browser unencrypted.', accent: 'from-blue-500 to-cyan-500' },
    { icon: Brain,          title: 'AI Chat Analysis',          desc: 'Upload WhatsApp, SMS, or email exports — AI detects manipulation, threats, and escalation patterns.', accent: 'from-purple-500 to-pink-500' },
    { icon: TrendingUp,     title: 'Income & Expense Tracker',  desc: 'Auto-calculates disposable income per Rajnesh v. Neha. One-click court-ready affidavit generation.', accent: 'from-emerald-500 to-teal-500' },
    { icon: Scale,          title: 'PDF Case File Export',      desc: 'Structured case files with timelines, evidence index, and AI summaries — ready for your lawyer in minutes.', accent: 'from-amber-500 to-orange-500' },
    { icon: MessageSquare,  title: 'Universal Chat Parser',     desc: 'WhatsApp .txt, Android SMS .csv, iOS Messages, .eml emails — auto-detected and parsed.', accent: 'from-rose-500 to-red-500' },
    { icon: Eye,            title: 'Red Flag Experience',       desc: 'Interactive AI simulations that teach you to recognize manipulation tactics in real-time.', accent: 'from-indigo-500 to-violet-500' },
  ]

  const steps = [
    { num: '01', icon: Upload,   title: 'Upload & Document',     desc: 'Add chats, photos, documents, and financials. Everything is encrypted and timestamped automatically.' },
    { num: '02', icon: BarChart3, title: 'AI Organizes & Analyzes', desc: 'AI structures evidence into timelines, detects risk patterns, and highlights what matters legally.' },
    { num: '03', icon: Download, title: 'Export & Share',          desc: 'Generate a structured PDF with evidence, analysis, and recommendations. Share securely with your lawyer.' },
  ]

  const faqs = [
    { q: 'Is this legal advice?', a: 'No. Blue Drum AI is a documentation and organization tool. Always consult a qualified lawyer for legal advice specific to your situation.' },
    { q: 'How is my data protected?', a: 'All files are encrypted client-side with AES-256 before upload. We use SHA-256 hashing for integrity verification. Your encryption key is derived from your account — even we cannot read your files.' },
    { q: 'Who is this platform for?', a: "Anyone navigating a relationship dispute in India — alimony, maintenance, dowry documentation, DV incident logging. Dedicated modules for both men and women." },
    { q: 'What chat formats are supported?', a: 'WhatsApp exports (.txt), Android SMS backups (.csv), iOS Messages, email threads (.eml), and manual text paste. The universal parser auto-detects the format.' },
    { q: 'Can I try it before committing?', a: 'Yes! The free plan includes all core features — evidence vault, AI analysis, income tracking, and PDF export. No credit card required.' },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">

      {/* ─────────────────────────────── NAV ─────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-100/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-blue-700 shadow-lg shadow-primary-600/20">
              <Shield className="h-[18px] w-[18px] text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Blue Drum <span className="text-primary-600">AI</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900">
                {l.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button onClick={() => navigate('/dashboard')} className="hidden rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all hover:bg-primary-700 sm:inline-flex">
                  Dashboard
                </button>
                <button onClick={() => signOut().then(() => navigate('/sign-in'))} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/sign-in" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 sm:inline-flex">
                  Sign in
                </Link>
                <Link to="/sign-up" className="group inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all hover:bg-primary-700 hover:shadow-lg">
                  Get Started <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="ml-1 rounded-lg p-2 text-gray-500 hover:bg-gray-50 lg:hidden" aria-label="Menu">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {mobileMenuOpen
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-5 pb-4 pt-2 lg:hidden">
            {navLinks.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 hover:bg-gray-50">
                {l.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ─────────────────────────────── HERO ────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[700px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary-100/70 via-blue-50/50 to-transparent blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-gradient-to-tl from-indigo-100/30 to-transparent blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 sm:pb-24 sm:pt-24 md:pb-28 md:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="fade-in-up visible mb-6 inline-flex items-center gap-2.5 rounded-full border border-green-200/80 bg-green-50/80 px-4 py-2 text-xs font-semibold text-green-700 shadow-sm">
              <span className="live-dot relative flex h-2 w-2 rounded-full bg-green-500" />
              Now Live — Free to Use
            </div>

            <h1 className="fade-in-up visible text-[2.25rem] font-extrabold leading-[1.12] tracking-tight sm:text-5xl md:text-6xl lg:text-[4.25rem]">
              Stop scrambling.
              <br />
              <span className="animate-gradient-text bg-gradient-to-r from-primary-600 via-blue-500 to-indigo-600">
                Start documenting.
              </span>
            </h1>

            <p className="fade-in-up visible mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-500 sm:text-lg md:text-xl">
              Blue Drum AI encrypts your evidence, analyzes your chats with AI, and
              generates lawyer-ready case files — so you walk into court prepared.
              <span className="font-medium text-gray-700"> Built for Indian law.</span>
            </p>

            <div className="fade-in-up visible mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/sign-up"
                className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-primary-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary-600/25 transition-all duration-300 hover:bg-primary-700 hover:shadow-2xl sm:w-auto"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <button
                onClick={() => scrollTo('how-it-works')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow-md sm:w-auto"
              >
                See How It Works
              </button>
            </div>

            <p className="fade-in-up visible mt-4 text-xs text-gray-400">
              No credit card &middot; Free plan includes all core features &middot; Not legal advice
            </p>
          </div>

          {/* Dashboard screenshot */}
          <div className="fade-in-up visible relative mx-auto mt-14 max-w-5xl sm:mt-18">
            <div className="rounded-2xl border border-gray-200/70 bg-gradient-to-b from-gray-50 to-white p-1.5 shadow-2xl shadow-gray-300/30">
              <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-900">
                <img
                  src="/screenshots/dashboard.jpg"
                  alt="Blue Drum AI Dashboard"
                  className="w-full"
                  loading="eager"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement
                    el.style.minHeight = '340px'
                    el.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="680" fill="none"%3E%3Crect width="1200" height="680" rx="12" fill="%23111827"/%3E%3Ctext x="600" y="320" text-anchor="middle" fill="%234B5563" font-family="system-ui" font-size="28" font-weight="700"%3EBlue Drum AI Dashboard%3C/text%3E%3Ctext x="600" y="365" text-anchor="middle" fill="%236B7280" font-family="system-ui" font-size="16"%3EEvidence Vault • AI Analysis • Income Tracker • PDF Export%3C/text%3E%3C/svg%3E'
                  }}
                />
              </div>
            </div>

            <div className="animate-float absolute -left-4 top-16 hidden rounded-2xl border border-white/80 bg-white/90 px-5 py-3.5 shadow-xl backdrop-blur lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">AES-256 Encrypted</div>
                  <div className="text-xs text-gray-400">Client-side, before upload</div>
                </div>
              </div>
            </div>

            <div className="animate-float-delayed absolute -right-4 bottom-20 hidden rounded-2xl border border-white/80 bg-white/90 px-5 py-3.5 shadow-xl backdrop-blur lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-md">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">AI-Powered Analysis</div>
                  <div className="text-xs text-gray-400">Red flags detected instantly</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────── TRUST STRIP ────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50/60 py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 text-sm text-gray-500">
          {[
            { icon: Scale, text: 'Rajnesh v. Neha compliant' },
            { icon: Lock, text: 'AES-256 encryption' },
            { icon: Shield, text: 'Row Level Security' },
            { icon: Fingerprint, text: 'SHA-256 integrity hashing' },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-2 font-medium">
              <Icon className="h-4 w-4 text-primary-500" />
              {text}
            </span>
          ))}
        </div>
      </section>

      {/* ──────────────── THE PROBLEM → SOLUTION ─────────────────────────── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>The Problem</SectionLabel>
            <h2 className="fade-in-up text-3xl font-bold tracking-tight sm:text-4xl">
              Disputes don&apos;t wait for you to get organized
            </h2>
            <p className="fade-in-up mt-5 text-base leading-relaxed text-gray-500 sm:text-lg">
              When a relationship turns into a legal battle, most people realize too late that their
              evidence is scattered across phones, emails, and memory.
              <strong className="text-gray-700"> Your lawyer needs structured facts — not a mess.</strong>
            </p>
          </div>

          <div className="fade-in-up mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
            {[
              { emoji: '📱', title: 'Scattered evidence',   desc: 'Screenshots across 5 apps, deleted messages, no timeline.' },
              { emoji: '⏰', title: 'No time to organize',  desc: "You're already stressed. Sorting files is the last thing you want." },
              { emoji: '⚖️', title: 'Lawyers need structure', desc: 'Unorganized evidence = weak case. Structured files = faster resolution.' },
            ].map((p) => (
              <div key={p.title} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 text-center transition-all hover:border-gray-200 hover:shadow-sm">
                <div className="mb-3 text-3xl">{p.emoji}</div>
                <h3 className="text-base font-bold text-gray-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────── FEATURES ────────────────────────────────── */}
      <section id="features" className="border-t border-gray-100 bg-gray-50/40 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Platform Features</SectionLabel>
            <h2 className="fade-in-up text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need, in one secure place
            </h2>
            <p className="fade-in-up mt-4 text-base text-gray-500 sm:text-lg">
              Six powerful features working together to build your case.
            </p>
          </div>

          <div className="stagger-children mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="fade-in-up group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-lg">
                <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} shadow-md`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900">{f.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────── HOW IT WORKS ────────────────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>How It Works</SectionLabel>
            <h2 className="fade-in-up text-3xl font-bold tracking-tight sm:text-4xl">
              From chaos to case file in 3 steps
            </h2>
            <p className="fade-in-up mt-4 text-base text-gray-500 sm:text-lg">
              No learning curve. Upload evidence, let AI organize, export for your lawyer.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-5xl">
            <div className="stagger-children grid grid-cols-1 gap-8 md:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.num} className="fade-in-up relative">
                  {i < steps.length - 1 && (
                    <div className="absolute left-[calc(50%+40px)] right-[calc(-50%+40px)] top-10 hidden h-px bg-gradient-to-r from-primary-300 to-primary-100 md:block" />
                  )}
                  <div className="relative text-center">
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50">
                      <s.icon className="h-8 w-8 text-primary-600" />
                    </div>
                    <Badge className="mb-3 border border-primary-100 bg-primary-50 text-primary-600">Step {s.num}</Badge>
                    <h3 className="text-lg font-bold text-gray-900">{s.title}</h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-gray-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="fade-in-up mt-12 text-center">
            <Link to="/sign-up" className="group inline-flex items-center gap-2.5 rounded-xl bg-gray-900 px-8 py-4 text-base font-bold text-white shadow-xl transition-all duration-300 hover:bg-gray-800 hover:shadow-2xl">
              Start in Under 2 Minutes <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────────────── MODULES ─────────────────────────────────── */}
      <section className="border-t border-gray-100 bg-gray-50/40 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Modules</SectionLabel>
            <h2 className="fade-in-up text-3xl font-bold tracking-tight sm:text-4xl">
              Built for both sides of the table
            </h2>
            <p className="fade-in-up mt-4 text-base text-gray-500 sm:text-lg">
              Dedicated modules for men and women — because fair outcomes require documented truth from everyone.
            </p>
          </div>

          <div className="fade-in-up mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            {/* Men */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">For Men</h3>
                  <p className="text-xs text-gray-400">Alimony clarity & false case protection</p>
                </div>
              </div>
              <ul className="space-y-3">
                {['Evidence vault with encrypted timeline', 'Income & expense tracker with affidavits', 'AI chat analysis and risk scoring', 'Breakup message generator (legally safe)', 'Lawyer-ready PDF case file export'].map((x) => (
                  <li key={x} className="flex items-center gap-2.5 text-sm text-gray-600"><CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />{x}</li>
                ))}
              </ul>
            </div>

            {/* Women */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-md">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">For Women</h3>
                  <p className="text-xs text-gray-400">DV documentation & maintenance rights</p>
                </div>
              </div>
              <ul className="space-y-3">
                {['Dowry documentation (gifts, receipts, transfers)', 'DV incident log with evidence attachments', 'Maintenance calculator with legal factors', 'Medical report organizer', 'Lawyer-ready PDF case file export'].map((x) => (
                  <li key={x} className="flex items-center gap-2.5 text-sm text-gray-600"><CheckCircle2 className="h-4 w-4 shrink-0 text-purple-500" />{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────── SECURITY ────────────────────────────────── */}
      <section id="security" className="relative overflow-hidden bg-gray-900 py-20 sm:py-24 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.15),transparent_70%)]" />

        <div className="relative mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.15em] text-primary-400">Security</p>
            <h2 className="fade-in-up text-3xl font-bold tracking-tight sm:text-4xl">Your data is yours. Period.</h2>
            <p className="fade-in-up mt-4 text-base text-gray-400 sm:text-lg">
              Zero-trust architecture. Even we cannot read your files.
            </p>
          </div>

          <div className="stagger-children mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: KeyRound,    title: 'AES-256 Encryption', desc: 'Files encrypted in your browser before upload.' },
              { icon: Fingerprint, title: 'SHA-256 Hashing',    desc: 'Tamper-proof integrity verification for every file.' },
              { icon: Lock,        title: 'PBKDF2 Key Derivation', desc: 'Your key comes from your account. We never see it.' },
              { icon: Server,      title: 'Row Level Security',    desc: 'Database policies ensure you only access your data.' },
            ].map((s) => (
              <div key={s.title} className="fade-in-up rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-all hover:bg-white/10">
                <s.icon className="mb-4 h-7 w-7 text-primary-400" />
                <h3 className="text-sm font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────── PRICING ─────────────────────────────────── */}
      <section id="pricing" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Pricing</SectionLabel>
            <h2 className="fade-in-up text-3xl font-bold tracking-tight sm:text-4xl">Start free, no strings attached</h2>
            <p className="fade-in-up mt-4 text-base text-gray-500 sm:text-lg">
              All core features included. No credit card needed.
            </p>
          </div>

          <div className="fade-in-up mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="text-sm font-semibold text-gray-500">Free</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-gray-900">&#8377;0</span>
                <span className="text-sm text-gray-400">/ forever</span>
              </div>
              <p className="mt-3 text-sm text-gray-500">Everything you need to get started.</p>
              <hr className="my-6 border-gray-100" />
              <ul className="space-y-3">
                {['Encrypted vault — 50 files, 100 MB', '5 AI analyses / month', '3 PDF exports / month', '3 Breakup Generator uses / month', 'Red Flag Experience — 3 sessions / month'].map((x) => (
                  <li key={x} className="flex items-center gap-2.5 text-sm text-gray-600"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary-500" />{x}</li>
                ))}
              </ul>
              <Link to="/sign-up" className="mt-8 flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow">
                Sign Up Free
              </Link>
            </div>

            {/* Premium */}
            <div className="relative rounded-2xl border-2 border-primary-500 bg-white p-8 shadow-lg shadow-primary-500/10">
              <Badge className="absolute -top-3 left-6 border border-primary-200 bg-primary-600 text-white shadow-md">Recommended</Badge>
              <div className="text-sm font-semibold text-gray-500">Premium</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-gray-900">&#8377;199</span>
                <span className="text-sm text-gray-400">/ month</span>
              </div>
              <p className="mt-3 text-sm text-gray-500">Unlimited everything. Priority support.</p>
              <hr className="my-6 border-gray-100" />
              <ul className="space-y-3">
                {['Everything in Free', 'Unlimited vault storage — 5 GB', 'Unlimited AI analyses', 'Unlimited PDF exports', 'Unlimited Breakup Generator', 'Unlimited Red Flag sessions', 'Priority support'].map((x) => (
                  <li key={x} className="flex items-center gap-2.5 text-sm text-gray-600"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary-500" />{x}</li>
                ))}
              </ul>
              <Link
                to={user ? '/dashboard/subscription' : '/sign-up'}
                className="mt-8 flex w-full items-center justify-center rounded-xl bg-primary-600 py-3.5 text-sm font-bold text-white shadow-md shadow-primary-600/20 transition-all hover:bg-primary-700 hover:shadow-lg"
              >
                {user ? 'Upgrade Now' : 'Get Started'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────── FAQ ─────────────────────────────────────── */}
      <section id="faq" className="border-t border-gray-100 bg-gray-50/40 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="fade-in-up text-3xl font-bold tracking-tight sm:text-4xl">Common questions, clear answers</h2>
          </div>

          <div className="fade-in-up mx-auto mt-14 max-w-2xl divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {faqs.map((f, idx) => {
              const isOpen = openFaq === idx
              return (
                <div key={f.q}>
                  <button type="button" onClick={() => setOpenFaq(isOpen ? null : idx)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-gray-50/80">
                    <span className="text-[15px] font-semibold text-gray-900">{f.q}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm leading-relaxed text-gray-500">{f.a}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ──────────────────────── FINAL CTA ──────────────────────────────── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="fade-in-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-blue-600 to-indigo-700 px-8 py-20 text-center text-white shadow-2xl shadow-primary-900/25 md:px-16">
            <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

            <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Don&apos;t wait until it&apos;s too late.
              <br className="hidden sm:block" />
              <span className="mt-2 block text-white/80 sm:mt-3">Start documenting today.</span>
            </h2>
            <p className="relative mx-auto mt-5 max-w-xl text-base text-white/60 sm:text-lg">
              Sign up in under 2 minutes. Upload your first evidence.
              Generate your first case file. Free forever on the core plan.
            </p>
            <div className="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/sign-up" className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-white px-8 py-4 text-base font-bold text-primary-700 shadow-xl transition-all duration-300 hover:shadow-2xl sm:w-auto">
                Create Free Account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/sign-in" className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10 sm:w-auto">
                Sign In
              </Link>
            </div>
            <p className="relative mt-8 text-xs text-white/40">
              No credit card required &middot; Not legal advice &middot; For documentation purposes only
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────── FOOTER ──────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white py-14">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-blue-700">
                <Shield className="h-[18px] w-[18px] text-white" />
              </div>
              <div>
                <div className="text-base font-bold">Blue Drum AI</div>
                <div className="text-xs text-gray-400">Truth. Evidence. Fair outcomes.</div>
              </div>
            </Link>

            <nav className="flex flex-wrap gap-6 text-sm text-gray-500">
              {navLinks.map((l) => (
                <button key={l.id} onClick={() => scrollTo(l.id)} className="transition-colors hover:text-gray-900">{l.label}</button>
              ))}
              <Link to="/sign-up" className="font-semibold text-primary-600 hover:text-primary-700">Get Started</Link>
            </nav>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-gray-100 pt-8 text-xs text-gray-400 md:flex-row md:items-center md:justify-between">
            <span>&copy; {new Date().getFullYear()} Blue Drum AI. All rights reserved.</span>
            <span>Not legal advice. For information and documentation purposes only.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
