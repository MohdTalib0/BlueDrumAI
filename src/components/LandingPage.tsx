import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
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
  FileText,
  AlertTriangle,
  Clock,
  Sparkles,
  Star,
  Play,
  Zap,
  Heart,
  Gift,
  Moon,
  Sun,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDarkMode } from '../hooks/useDarkMode'
import { WordRotate } from './magicui/WordRotate'
import { NumberTicker } from './magicui/NumberTicker'
import { BlurIn } from './magicui/BlurIn'
import { ShimmerButton } from './magicui/ShimmerButton'
import { Marquee } from './magicui/Marquee'
import { FadeIn } from './magicui/FadeIn'

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

function BrowserChrome({ url = 'app.bluedrumai.com' }: { url?: string }) {
  return (
    <div className="rounded-t-xl border-b border-gray-200/50 dark:border-primary-500/20 bg-gray-100/80 dark:bg-primary-900/30 px-4 py-2.5 flex items-center gap-2">
      <div className="flex gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
      </div>
      <div className="ml-3 flex-1 rounded-md bg-white/80 dark:bg-primary-900/40 px-3 py-1 text-[10px] text-gray-400 font-mono">
        {url}
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════ */

const navLinks = [
  { label: 'Features', id: 'features' },
  { label: 'How it works', id: 'how-it-works' },
  { label: 'Security', id: 'security' },
  { label: 'Pricing', id: 'pricing' },
]

const stats = [
  { value: 2500, suffix: '+', label: 'Evidence files secured', icon: Shield },
  { value: 98, suffix: '%', label: 'Client-side encrypted', icon: Lock },
  { value: 500, suffix: '+', label: 'Cases documented', icon: Scale },
  { value: 4.9, suffix: '/5', label: 'User satisfaction', icon: Star, isDecimal: true },
]

const problems = [
  { icon: AlertTriangle, title: 'Scattered evidence', desc: 'Screenshots across 5 apps, deleted messages, no timeline.', color: 'from-red-500 to-rose-600', bg: 'bg-red-50', border: 'hover:border-red-200' },
  { icon: Clock, title: 'No time to organize', desc: "You're already stressed. Sorting files is the last thing you want.", color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', border: 'hover:border-amber-200' },
  { icon: Scale, title: 'Lawyers need structure', desc: 'Unorganized evidence = weak case. Structured files = faster resolution.', color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', border: 'hover:border-blue-200' },
]

const showcaseFeatures = [
  {
    icon: Brain, screenshot: '/screenshots/chat-analyzer.png', alt: 'AI Chat Analyzer',
    title: 'AI Chat Analysis', accent: 'from-purple-500 to-pink-500',
    desc: 'Upload WhatsApp, SMS, or email exports. AI detects manipulation, threats, and escalation patterns across thousands of messages in seconds.',
    highlights: ['Auto-detects chat format', 'Risk score per conversation', 'Red flag timeline extraction'],
  },
  {
    icon: TrendingUp, screenshot: '/screenshots/income-tracker.png', alt: 'Income & Expense Tracker',
    title: 'Income & Expense Tracker', accent: 'from-emerald-500 to-teal-500',
    desc: 'Auto-calculates disposable income per Rajnesh v. Neha guidelines. Generate court-ready affidavits with one click.',
    highlights: ['Rajnesh v. Neha compliant', 'One-click affidavit generation', 'Monthly trend analysis'],
  },
  {
    icon: Lock, screenshot: '/screenshots/vault-timeline.png', alt: 'Encrypted Evidence Vault',
    title: 'Encrypted Evidence Vault', accent: 'from-blue-500 to-cyan-500',
    desc: 'AES-256 client-side encryption with SHA-256 hashing. Your files never leave your browser unencrypted. Visual timeline of all evidence.',
    highlights: ['Client-side AES-256 encryption', 'Visual evidence timeline', 'SHA-256 integrity hashing'],
  },
]

const supportingFeatures = [
  { icon: Scale, title: 'PDF Case File Export', desc: 'Structured case files with timelines, evidence index, and AI summaries — ready for your lawyer in minutes.', accent: 'from-amber-500 to-orange-500' },
  { icon: MessageSquare, title: 'Universal Chat Parser', desc: 'WhatsApp .txt, Android SMS .csv, iOS Messages, .eml emails — auto-detected and parsed.', accent: 'from-rose-500 to-red-500' },
  { icon: Eye, title: 'Red Flag Experience', desc: 'Interactive AI simulations that teach you to recognize manipulation tactics in real-time.', accent: 'from-indigo-500 to-violet-500' },
]

const howItWorks = [
  { num: '01', icon: Upload, title: 'Upload & Document', desc: 'Add chats, photos, documents, and financials. Everything is encrypted and timestamped automatically.', screenshot: '/screenshots/vault-timeline.png', imgAlt: 'Evidence vault upload interface', direction: 'left' as const, tags: ['WhatsApp', 'SMS', 'Email', 'Photos', 'Documents'] },
  { num: '02', icon: BarChart3, title: 'AI Organizes & Analyzes', desc: 'AI structures evidence into timelines, detects risk patterns, and highlights what matters legally.', screenshot: '/screenshots/chat-analyzer.png', imgAlt: 'AI chat analysis results', direction: 'right' as const },
  { num: '03', icon: Download, title: 'Export & Share', desc: 'Generate a structured PDF with evidence, analysis, and recommendations. Share securely with your lawyer.', screenshot: '/screenshots/income-tracker.png', imgAlt: 'Income tracker and export interface', direction: 'left' as const },
]

const menFeatures = [
  { text: 'Evidence vault with encrypted timeline', icon: Lock },
  { text: 'Income & expense tracker with affidavits', icon: TrendingUp },
  { text: 'AI chat analysis and risk scoring', icon: Brain },
  { text: 'Breakup message generator (legally safe)', icon: MessageSquare },
  { text: 'Lawyer-ready PDF case file export', icon: FileText },
]

const womenFeatures = [
  { text: 'Dowry documentation (gifts, receipts, transfers)', icon: Gift },
  { text: 'DV incident log with evidence attachments', icon: AlertTriangle },
  { text: 'Maintenance calculator with legal factors', icon: Scale },
  { text: 'Medical report organizer', icon: Heart },
  { text: 'Lawyer-ready PDF case file export', icon: FileText },
]

const securityCards = [
  { icon: KeyRound, title: 'AES-256 Encryption', desc: 'Files encrypted in your browser before upload.', glow: 'hover:shadow-blue-500/10' },
  { icon: Fingerprint, title: 'SHA-256 Hashing', desc: 'Tamper-proof integrity verification for every file.', glow: 'hover:shadow-purple-500/10' },
  { icon: Lock, title: 'PBKDF2 Key Derivation', desc: 'Your key comes from your account. We never see it.', glow: 'hover:shadow-emerald-500/10' },
  { icon: Server, title: 'Row Level Security', desc: 'Database policies ensure you only access your data.', glow: 'hover:shadow-amber-500/10' },
]

const faqs = [
  { q: 'Is this legal advice?', a: 'No. Blue Drum AI is a documentation and organization tool. Always consult a qualified lawyer for legal advice specific to your situation.' },
  { q: 'How is my data protected?', a: 'All files are encrypted client-side with AES-256 before upload. We use SHA-256 hashing for integrity verification. Your encryption key is derived from your account — even we cannot read your files.' },
  { q: 'Who is this platform for?', a: "Anyone navigating a relationship dispute in India — alimony, maintenance, dowry documentation, DV incident logging. Dedicated modules for both men and women." },
  { q: 'What chat formats are supported?', a: 'WhatsApp exports (.txt), Android SMS backups (.csv), iOS Messages, email threads (.eml), and manual text paste. The universal parser auto-detects the format.' },
  { q: 'Can I try it before committing?', a: 'Yes! The free plan includes all core features — evidence vault, AI analysis, income tracking, and PDF export. No credit card required.' },
]

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const { user, profileReady, signOut } = useAuth()
  const navigate = useNavigate()
  const { dark, toggle: toggleDark } = useDarkMode()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeScreenshot, setActiveScreenshot] = useState(0)
  const [activeModule, setActiveModule] = useState<'men' | 'women'>('men')

  useScrollReveal()

  useEffect(() => {
    if (user && profileReady) {
      navigate(user.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true })
    }
  }, [user, profileReady, navigate])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollTo = useCallback((id: string) => {
    setMobileMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50/30 to-white dark:from-black dark:via-black dark:to-black text-gray-900 dark:text-gray-100 antialiased font-sans transition-colors duration-300">

      {/* ─────────────────────────────── NAV ─────────────────────────────── */}
      <header className={`sticky inset-x-0 top-0 z-50 border-b transition-all duration-300 ${scrolled ? 'border-blue-100/80 bg-white/80 dark:border-gray-800 dark:bg-black/80 shadow-md shadow-blue-100/20 dark:shadow-black/20' : 'border-blue-100/50 dark:border-gray-800/50 bg-gradient-to-br from-blue-50/40 via-yellow-50/20 to-white/40 dark:from-black/40 dark:via-black/20 dark:to-black/40'} backdrop-blur-xl`}>
        <div className="flex w-full items-center justify-between px-5 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center">
                <img src="/logo.svg" alt="Blue Drum AI" className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <div className="leading-tight">
                <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Blue Drum AI</div>
                <div className="hidden sm:block text-xs text-gray-500 dark:text-gray-400">Evidence-based legal vigilance</div>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-primary-900/20 hover:text-gray-900 dark:hover:text-white">
                {l.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {user ? (
              <>
                <button onClick={() => navigate('/dashboard')} className="hidden rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all hover:bg-primary-700 sm:inline-flex">
                  Dashboard
                </button>
                <button onClick={() => signOut().then(() => navigate('/sign-in'))} className="rounded-lg border border-gray-200 dark:border-primary-500/20 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 transition hover:border-gray-300 dark:hover:border-primary-500/30">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/sign-in" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-white sm:inline-flex">
                  Sign in
                </Link>
                <Link to="/sign-up" className="group inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all hover:bg-primary-700 hover:shadow-lg">
                  Get Started <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="ml-1 rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-primary-900/20 lg:hidden" aria-label="Menu">
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
          <div className="border-t border-blue-100/50 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-sm px-5 pb-4 pt-2 lg:hidden">
            {navLinks.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-primary-900/20">
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
          <div className="dot-pattern absolute inset-0 opacity-40" />
          <img src="/drum.svg" alt="" aria-hidden="true" className="absolute -right-20 top-10 h-64 w-64 opacity-[0.04] blur-[1px]" />
        </div>

        <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 sm:pb-24 sm:pt-24 md:pb-28 md:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <BlurIn delay={0.1}>
              <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-primary-200/80 dark:border-primary-700/50 bg-primary-50/80 dark:bg-primary-900/30 px-4 py-2 text-xs font-semibold text-primary-700 dark:text-primary-300 shadow-sm transition-all hover:shadow-md hover:bg-primary-100/80 dark:hover:bg-primary-800/40 cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-primary-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
                </span>
                AI-Powered Legal Protection for India
              </div>
            </BlurIn>

            <BlurIn delay={0.25}>
              <h1 className="text-[2.25rem] font-extrabold leading-[1.12] tracking-tight sm:text-5xl md:text-6xl lg:text-[4.25rem]">
                Stop scrambling.
                <br />
                <span className="animate-gradient-text bg-gradient-to-r from-primary-600 via-blue-500 to-indigo-600">Start</span>{' '}
                <WordRotate
                  words={['documenting.', 'protecting.', 'organizing.', 'building your case.']}
                  duration={3000}
                  className="inline-flex"
                />
              </h1>
            </BlurIn>

            <BlurIn delay={0.45}>
              <p className="mx-auto mt-6 max-w-2xl px-4 sm:px-0 text-base leading-relaxed text-gray-500 dark:text-gray-400 sm:text-lg md:text-xl">
                Blue Drum AI encrypts your evidence, analyzes your chats with AI, and
                generates lawyer-ready case files — so you walk into court prepared.
                <span className="font-medium text-gray-700 dark:text-gray-200"> Built for Indian law.</span>
              </p>
            </BlurIn>

            <BlurIn delay={0.6}>
              <div className="mt-10 sm:mt-9 flex flex-col items-center justify-center gap-3 px-4 sm:px-0 sm:flex-row">
                <Link to="/sign-up" className="w-full sm:w-auto">
                  <ShimmerButton className="w-full sm:w-auto">
                    Get Started Free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </ShimmerButton>
                </Link>
                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-primary-500/20 bg-white dark:bg-primary-900/20 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm transition-all hover:border-gray-300 dark:hover:border-primary-500/30 hover:shadow-md sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                >
                  See How It Works
                </button>
              </div>
            </BlurIn>

            <BlurIn delay={0.75}>
              <button onClick={() => scrollTo('features')} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 transition-colors hover:text-primary-600">
                <Play className="h-3 w-3" /> See it in action
              </button>
            </BlurIn>
          </div>

          {/* Dashboard screenshot with browser chrome */}
          <div className="fade-in-up visible relative mx-auto mt-14 max-w-5xl sm:mt-18">
            <div className="rounded-2xl border border-gray-200/70 dark:border-primary-500/20 bg-gradient-to-b from-gray-50 to-white dark:from-primary-900/20 dark:to-black/50 p-1.5 shadow-2xl shadow-gray-300/30 dark:shadow-primary-900/10">
              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-primary-500/10">
                <BrowserChrome url="app.bluedrumai.com/dashboard" />
                <div className="bg-gray-900">
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
            </div>

            {/* Floating badge: Encrypted */}
            <div className="animate-float absolute -left-4 top-16 hidden rounded-2xl border border-white/80 dark:border-primary-500/20 bg-white/90 dark:bg-primary-900/20 px-5 py-3.5 shadow-xl backdrop-blur lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">AES-256 Encrypted</div>
                  <div className="text-xs text-gray-400">Client-side, before upload</div>
                </div>
              </div>
            </div>

            {/* Floating badge: AI Analysis */}
            <div className="animate-float-delayed absolute -right-4 top-24 hidden rounded-2xl border border-white/80 dark:border-primary-500/20 bg-white/90 dark:bg-primary-900/20 px-5 py-3.5 shadow-xl backdrop-blur lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-md">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">AI-Powered Analysis</div>
                  <div className="text-xs text-gray-400">Red flags detected instantly</div>
                </div>
              </div>
            </div>

            {/* Floating badge: PDF Export */}
            <div className="animate-float absolute -left-2 bottom-12 hidden rounded-2xl border border-white/80 dark:border-primary-500/20 bg-white/90 dark:bg-primary-900/20 px-4 py-3 shadow-xl backdrop-blur lg:block" style={{ animationDelay: '0.8s' }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">PDF Export Ready</div>
                  <div className="text-xs text-gray-400">Court-formatted case files</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────── STATS STRIP ────────────────────────────── */}
      <section className="border-y border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-black/60 py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                  <s.icon className="h-5 w-5 text-primary-500" />
                </div>
                <div className="text-2xl font-extrabold text-gray-900 dark:text-white sm:text-3xl">
                  <NumberTicker value={s.value} decimals={s.isDecimal ? 1 : 0} />{s.suffix}
                </div>
                <div className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────── TRUST MARQUEE ──────────────────────────── */}
      <section className="overflow-hidden border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black py-6">
        <Marquee speed={30} pauseOnHover>
          {[
            { icon: Shield, text: 'AES-256 Encrypted' },
            { icon: Lock, text: 'Zero-Knowledge Architecture' },
            { icon: Scale, text: 'Indian Family Law Compliant' },
            { icon: Brain, text: 'AI-Powered Risk Analysis' },
            { icon: FileText, text: 'Court-Ready PDF Export' },
            { icon: Fingerprint, text: 'SHA-256 Integrity Hashing' },
            { icon: Server, text: 'Supabase Row Level Security' },
            { icon: Sparkles, text: 'Smart Chat Parsing' },
          ].map((item) => (
            <div key={item.text} className="mx-4 flex items-center gap-2 text-sm font-medium text-gray-400">
              <item.icon className="h-4 w-4 text-primary-400/60" />
              {item.text}
            </div>
          ))}
        </Marquee>
      </section>

      {/* ──────────────── THE PROBLEM → SOLUTION ─────────────────────────── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-3xl text-center">
            <FadeIn><SectionLabel>The Problem</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl dark:text-white">
                Disputes don&apos;t wait for you to get organized
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-5 text-base leading-relaxed text-gray-500 dark:text-gray-400 sm:text-lg">
                When a relationship turns into a legal battle, most people realize too late that their
                evidence is scattered across phones, emails, and memory.
                <strong className="text-gray-700 dark:text-gray-200"> Your lawyer needs structured facts — not a mess.</strong>
              </p>
            </FadeIn>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
            {problems.map((p, i) => (
              <FadeIn key={p.title} delay={0.1 * i}>
                <div className={`group rounded-2xl border border-gray-100 dark:border-primary-500/20 ${p.bg}/30 dark:bg-primary-900/20 p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${p.border}`}>
                  <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${p.color} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                    <p.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{p.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────── FEATURES SHOWCASE ──────────────────────── */}
      <section id="features" className="border-t border-blue-100/40 dark:border-gray-800 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <FadeIn><SectionLabel>Platform Features</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl dark:text-white">
                See what Blue Drum AI can do
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-base text-gray-500 dark:text-gray-400 sm:text-lg">
                Three core modules working together to build your case.
              </p>
            </FadeIn>
          </div>

          {/* Tab buttons */}
          <div className="fade-in-up mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-2">
            {showcaseFeatures.map((tab, idx) => (
              <button
                key={tab.title}
                onClick={() => setActiveScreenshot(idx)}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  activeScreenshot === idx
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                    : 'bg-gray-100 dark:bg-primary-900/20 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-primary-900/30'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.title}
              </button>
            ))}
          </div>

          {/* Screenshot + Description panels */}
          <div className="mx-auto mt-10 max-w-6xl">
            {showcaseFeatures.map((item, idx) => (
              <div key={item.title} className={`${activeScreenshot === idx ? 'block' : 'hidden'}`}>
                <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-5">
                  {/* Screenshot — 3 cols */}
                  <div className="lg:col-span-3">
                    <div className="overflow-hidden rounded-2xl border border-gray-200/70 dark:border-primary-500/20 bg-gradient-to-b from-gray-50 to-white dark:from-primary-900/20 dark:to-black/50 p-1 shadow-2xl shadow-gray-300/30 dark:shadow-primary-900/10">
                      <BrowserChrome />
                      <img
                        src={item.screenshot}
                        alt={item.alt}
                        className="w-full max-h-[400px] object-cover object-top"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Description — 2 cols */}
                  <div className="lg:col-span-2">
                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} shadow-lg`}>
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="mt-3 text-base leading-relaxed text-gray-500 dark:text-gray-400">{item.desc}</p>
                    <ul className="mt-5 space-y-2.5">
                      {item.highlights.map((h) => (
                        <li key={h} className="flex items-center gap-2.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-500" />
                          {h}
                        </li>
                      ))}
                    </ul>
                    <Link to="/sign-up" className="group mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary-600 transition-colors hover:text-primary-700">
                      Try it free <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Supporting features grid */}
          <div className="mx-auto mt-16 max-w-5xl border-t border-gray-100 dark:border-gray-800 pt-16">
            <FadeIn>
              <h3 className="mb-8 text-center text-lg font-bold text-gray-900 dark:text-white">Plus these powerful tools</h3>
            </FadeIn>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {supportingFeatures.map((f, i) => (
                <FadeIn key={f.title} delay={0.1 * i}>
                  <div className="group relative overflow-hidden rounded-2xl border border-blue-100/60 dark:border-primary-500/20 bg-white/70 dark:bg-primary-900/20 backdrop-blur-sm p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200/80 dark:hover:border-primary-500/30 hover:shadow-lg hover:bg-white/90 dark:hover:bg-primary-900/30">
                    <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                      <f.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{f.desc}</p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary-500 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
                      Learn more <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────── HOW IT WORKS ────────────────────────────── */}
      <section id="how-it-works" className="relative py-20 sm:py-28 bg-gradient-to-b from-white via-blue-50/20 to-white dark:from-black dark:via-gray-900/50 dark:to-black">
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <FadeIn><SectionLabel>How It Works</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl dark:text-white">
                From chaos to case file in 3 steps
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-base text-gray-500 dark:text-gray-400 sm:text-lg">
                No learning curve. Upload evidence, let AI organize, export for your lawyer.
              </p>
            </FadeIn>
          </div>

          <div className="mx-auto mt-16 max-w-5xl space-y-16">
            {howItWorks.map((s, i) => (
              <FadeIn key={s.num} delay={0.1 * i} direction={s.direction === 'right' ? 'right' : 'left'}>
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
                {/* Screenshot */}
                <div className={s.direction === 'right' ? 'lg:order-2' : ''}>
                  <div className="overflow-hidden rounded-2xl border border-gray-200/60 dark:border-primary-500/20 shadow-xl shadow-gray-200/30 dark:shadow-primary-900/10">
                    <img src={s.screenshot} alt={s.imgAlt} className="w-full max-h-[400px] object-cover object-top" loading="lazy" />
                  </div>
                </div>
                {/* Text */}
                <div className={s.direction === 'right' ? 'lg:order-1' : ''}>
                  <Badge className="mb-4 border border-primary-100 bg-primary-50 text-primary-600">Step {s.num}</Badge>
                  <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg">
                    <s.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{s.title}</h3>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-gray-500 dark:text-gray-400">{s.desc}</p>
                  {s.tags && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.tags.map((fmt) => (
                        <span key={fmt} className="rounded-full bg-gray-100 dark:bg-primary-900/30 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">{fmt}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn>
            <div className="mt-16 text-center">
              <Link to="/sign-up" className="group inline-flex items-center gap-2.5 rounded-xl bg-gray-900 px-8 py-4 text-base font-bold text-white shadow-xl transition-all duration-300 hover:bg-gray-800 hover:shadow-2xl">
                Start in Under 2 Minutes <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ──────────────────────── MODULES ─────────────────────────────────── */}
      <section className="border-t border-blue-100/40 dark:border-gray-800 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <FadeIn><SectionLabel>Modules</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl dark:text-white">
                Built for both sides of the table
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-base text-gray-500 dark:text-gray-400 sm:text-lg">
                Dedicated modules for men and women — because fair outcomes require documented truth from everyone.
              </p>
            </FadeIn>
          </div>

          {/* Toggle */}
          <div className="fade-in-up mx-auto mt-10 flex max-w-xs rounded-xl bg-gray-100 dark:bg-primary-900/30 p-1">
            {(['men', 'women'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveModule(tab)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all duration-300 ${
                  activeModule === tab
                    ? tab === 'men'
                      ? 'bg-white dark:bg-primary-900/40 text-blue-600 shadow-md'
                      : 'bg-white dark:bg-primary-900/40 text-purple-600 shadow-md'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab === 'men' ? 'For Men' : 'For Women'}
              </button>
            ))}
          </div>

          {/* Module content */}
          <div className="fade-in-up mx-auto mt-10 max-w-4xl">
            {/* Men */}
            <div className={`transition-all duration-300 ${activeModule === 'men' ? 'block' : 'hidden'}`}>
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
                <div>
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md shadow-blue-200/50">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">For Men</h3>
                      <p className="text-xs text-gray-400">Alimony clarity & false case protection</p>
                    </div>
                  </div>
                  <ul className="space-y-3.5">
                    {menFeatures.map((x) => (
                      <li key={x.text} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-primary-900/20">
                          <x.icon className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        {x.text}
                      </li>
                    ))}
                  </ul>
                  <Link to="/sign-up" className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-700">
                    Get Started <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
                <div className="overflow-hidden rounded-2xl border border-blue-200/40 dark:border-primary-500/20 shadow-lg">
                  <img src="/screenshots/income-tracker.png" alt="Income tracker for men" className="w-full max-h-[400px] object-cover object-top" loading="lazy" />
                </div>
              </div>
            </div>

            {/* Women */}
            <div className={`transition-all duration-300 ${activeModule === 'women' ? 'block' : 'hidden'}`}>
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
                <div>
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-md shadow-purple-200/50">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">For Women</h3>
                      <p className="text-xs text-gray-400">DV documentation & maintenance rights</p>
                    </div>
                  </div>
                  <ul className="space-y-3.5">
                    {womenFeatures.map((x) => (
                      <li key={x.text} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-primary-900/20">
                          <x.icon className="h-3.5 w-3.5 text-purple-500" />
                        </div>
                        {x.text}
                      </li>
                    ))}
                  </ul>
                  <Link to="/sign-up" className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-purple-700">
                    Get Started <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
                <div className="overflow-hidden rounded-2xl border border-purple-200/40 dark:border-primary-500/20 shadow-lg">
                  <img src="/screenshots/vault-timeline.png" alt="Evidence vault for women" className="w-full max-h-[400px] object-cover object-top" loading="lazy" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────── SECURITY ────────────────────────────────── */}
      <section id="security" className="relative overflow-hidden bg-gray-900 py-20 sm:py-28 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.15),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M60 0H0v60\' fill=\'none\' stroke=\'white\' stroke-width=\'0.5\'/%3E%3C/svg%3E")' }} />

        <div className="relative mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <FadeIn>
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.15em] text-primary-400">Security</p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 ring-1 ring-primary-500/30">
                <Shield className="h-8 w-8 text-primary-400" />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Your data is yours. Period.</h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-base text-gray-400 sm:text-lg">
                Zero-trust architecture. Even we cannot read your files.
              </p>
            </FadeIn>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {securityCards.map((s, i) => (
              <FadeIn key={s.title} delay={0.1 * i}>
                <div className={`group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-all duration-300 hover:bg-white/10 hover:-translate-y-1 hover:shadow-xl ${s.glow}`}>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 transition-transform duration-300 group-hover:scale-110">
                    <s.icon className="h-6 w-6 text-primary-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-gray-500">
            {['SOC 2 Architecture', 'GDPR Ready', 'Supabase RLS', 'Zero-Knowledge Design'].map((b) => (
              <span key={b} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary-500/60" /> {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────── PRICING ─────────────────────────────────── */}
      <section id="pricing" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <FadeIn><SectionLabel>Pricing</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl dark:text-white">Start free, no strings attached</h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-base text-gray-500 dark:text-gray-400 sm:text-lg">
                All core features included. No credit card needed.
              </p>
            </FadeIn>
          </div>

          <FadeIn delay={0.15}>
          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl border border-blue-100/60 dark:border-primary-500/20 bg-white/70 dark:bg-primary-900/20 backdrop-blur-sm p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-200/80 dark:hover:border-primary-500/30">
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">Free</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">&#8377;0</span>
                <span className="text-sm text-gray-400">/ forever</span>
              </div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Everything you need to get started.</p>
              <hr className="my-6 border-blue-100/50 dark:border-gray-700" />
              <ul className="space-y-3">
                {['Encrypted vault — 50 files, 100 MB', '5 AI analyses / month', '3 PDF exports / month', '3 Breakup Generator uses / month', 'Red Flag Experience — 3 sessions / month'].map((x) => (
                  <li key={x} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary-500" />{x}</li>
                ))}
              </ul>
              <Link to="/sign-up" className="mt-8 flex w-full items-center justify-center rounded-xl border border-gray-200 dark:border-primary-500/20 bg-white dark:bg-primary-900/20 py-3.5 text-sm font-bold text-gray-700 dark:text-gray-200 shadow-sm transition-all hover:border-gray-300 dark:hover:border-primary-500/30 hover:shadow">
                Sign Up Free
              </Link>
            </div>

            {/* Premium */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-primary-400/70 dark:border-primary-500/40 bg-gradient-to-br from-primary-50/60 via-white/80 to-blue-50/50 dark:from-primary-900/20 dark:via-black/80 dark:to-black/50 p-8 shadow-lg shadow-primary-200/30 dark:shadow-primary-900/20 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="absolute -right-12 top-6 rotate-45 bg-primary-600 px-12 py-1 text-[10px] font-bold text-white shadow-md">
                POPULAR
              </div>
              <div className="text-sm font-semibold text-primary-600">Premium</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">&#8377;199</span>
                <span className="text-sm text-gray-400">/ month</span>
              </div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Unlimited everything. Priority support.</p>
              <hr className="my-6 border-primary-100/50 dark:border-gray-700" />
              <ul className="space-y-3">
                {['Everything in Free', 'Unlimited vault storage — 5 GB', 'Unlimited AI analyses', 'Unlimited PDF exports', 'Unlimited Breakup Generator', 'Unlimited Red Flag sessions', 'Priority support'].map((x) => (
                  <li key={x} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary-500" />{x}</li>
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
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="mx-auto mt-8 max-w-4xl text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Both plans include: Encrypted vault, AI analysis, Income tracker, PDF export, Chat parser
              </p>
              <div className="mx-auto mt-4 flex items-center justify-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> No lock-in</span>
                <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Cancel anytime</span>
                <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Secure payments</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ──────────────────────── FAQ ─────────────────────────────────────── */}
      <section id="faq" className="border-t border-blue-100/40 dark:border-gray-800 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <FadeIn><SectionLabel>FAQ</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl dark:text-white">Common questions, clear answers</h2>
            </FadeIn>
          </div>

          <FadeIn delay={0.2}>
          <div className="mx-auto mt-14 max-w-2xl divide-y divide-blue-100/50 dark:divide-primary-500/10 rounded-2xl border border-blue-100/60 dark:border-primary-500/20 bg-white/70 dark:bg-primary-900/20 backdrop-blur-sm shadow-sm overflow-hidden">
            {faqs.map((f, idx) => {
              const isOpen = openFaq === idx
              return (
                <div key={f.q}>
                  <button type="button" onClick={() => setOpenFaq(isOpen ? null : idx)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-primary-900/30">
                    <span className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20 text-xs font-bold text-primary-500">
                        {idx + 1}
                      </span>
                      <span className="text-[15px] font-semibold text-gray-900 dark:text-white">{f.q}</span>
                    </span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 pl-16 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{f.a}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="mx-auto mt-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Still have questions?{' '}
                <a href="mailto:support@bluedrumai.com" className="font-semibold text-primary-600 hover:text-primary-700">
                  Reach out to us
                </a>
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ──────────────────────── FINAL CTA ──────────────────────────────── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="fade-in-up relative mx-auto max-w-5xl rounded-3xl p-[2px] bg-gradient-to-r from-primary-400 via-blue-300 to-indigo-400">
            <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-blue-100/80 via-blue-50/60 to-yellow-50/40 dark:from-primary-900/20 dark:via-black/80 dark:to-black/50 px-8 py-20 text-center md:px-16">
              <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-200/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-yellow-100/30 blur-3xl" />
              <img src="/drum.svg" alt="" aria-hidden="true" className="pointer-events-none absolute right-8 top-8 h-32 w-32 opacity-[0.06]" />

              <h2 className="relative text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl md:text-5xl">
                Don&apos;t wait until it&apos;s too late.
                <br className="hidden sm:block" />
                <span className="mt-2 block text-primary-600 sm:mt-3">Start documenting today.</span>
              </h2>
              <p className="relative mx-auto mt-5 max-w-xl text-base text-gray-500 dark:text-gray-400 sm:text-lg">
                Sign up in under 2 minutes. Upload your first evidence.
                Generate your first case file. Free forever on the core plan.
              </p>
              <div className="relative mt-5 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                <Sparkles className="h-4 w-4 text-primary-500" />
                Join 500+ users already documenting their cases
              </div>
              <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/sign-up" className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-primary-600/20 transition-all duration-300 hover:bg-primary-700 hover:shadow-xl sm:w-auto">
                  Create Free Account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to="/sign-in" className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 dark:border-primary-500/20 px-8 py-4 text-base font-semibold text-gray-600 dark:text-gray-300 transition-all hover:border-gray-300 dark:hover:border-primary-500/30 hover:bg-white/60 dark:hover:bg-primary-900/30 sm:w-auto">
                  Sign In
                </Link>
              </div>
              <p className="relative mt-8 text-xs text-gray-400 dark:text-gray-500">
                No credit card required &middot; Not legal advice &middot; For documentation purposes only
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────── FOOTER ──────────────────────────────────── */}
      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-black py-14">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <Link to="/" className="flex items-center gap-2.5">
                <img src="/logo.svg" alt="Blue Drum AI" className="h-9 w-9" />
                <div>
                  <div className="text-base font-bold dark:text-white">Blue Drum AI</div>
                  <div className="text-xs text-gray-400">Truth. Evidence. Fair outcomes.</div>
                </div>
              </Link>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary-400" /> AES-256 Encrypted
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-primary-400" /> Zero-Knowledge
                </span>
              </div>
            </div>

            <nav className="flex flex-wrap gap-6 text-sm text-gray-500 dark:text-gray-400">
              {navLinks.map((l) => (
                <button key={l.id} onClick={() => scrollTo(l.id)} className="transition-colors hover:text-gray-900 dark:hover:text-white">{l.label}</button>
              ))}
              <Link to="/sign-up" className="font-semibold text-primary-600 hover:text-primary-700">Get Started</Link>
            </nav>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800 pt-8 text-xs text-gray-400 md:flex-row md:items-center md:justify-between">
            <span>&copy; {new Date().getFullYear()} Blue Drum AI. All rights reserved.</span>
            <span>Not legal advice. For information and documentation purposes only.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
