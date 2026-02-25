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
import SampleCasePreview from './SampleCasePreview'
import { DemoMock } from './landing/DemoMock'

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

const navLinks: Array<
  | { label: string; path: string; type: 'link' }
  | { label: string; id: string; type: 'scroll' }
> = [
  { label: 'Who Is It For', id: 'who-is-it-for', type: 'scroll' },
  { label: 'What You Can Do', id: 'features', type: 'scroll' },
  { label: 'How It Works', id: 'how-it-works', type: 'scroll' },
  { label: 'Privacy', id: 'security', type: 'scroll' },
  { label: 'Pricing', id: 'pricing', type: 'scroll' },
]

const couplesWhoIsFor = [
  { title: 'Dating and want to be prepared', desc: 'Start documenting gifts, important conversations, and receipts. Peace of mind without paranoia.' },
  { title: 'Live-in relationship', desc: 'Document your shared life - transfers, agreements, and key moments. Built for Indian legal context.' },
  { title: "Things aren't great", desc: "You're not ready to leave yet, but you want your ducks in a row. Document now, decide later." },
  { title: "You've seen messy breakups", desc: "Friends or family went through chaos. You're not taking that risk." },
]

const divorceWhoIsFor = [
  { title: 'Going through divorce or separation', desc: 'You need to organize months or years of conversations, financial records, and documents before your hearing.' },
  { title: 'Your lawyer asked for organized evidence', desc: 'They need a timeline, structured documents, and financial summaries - not a folder of screenshots.' },
  { title: 'Preparing for maintenance or alimony proceedings', desc: 'Court-format affidavits, income documentation, and expense tracking. Built for Indian law.' },
  { title: 'Documenting dowry or domestic incidents', desc: 'Gift records, incident logs, medical reports. Structured for legal proceedings.' },
]

const couplesFeatures = [
  { icon: Brain, title: 'Red Flag Radar', desc: 'AI analyzes your WhatsApp, SMS, or email conversations. Spots manipulation, gaslighting, and financial threats in seconds.', detail: 'Paste or upload any chat. Our AI identifies patterns you might miss - contradictions, intimidation, isolation tactics. Get a risk score and highlighted moments.', gradient: 'from-violet-400 to-purple-500' },
  { icon: Lock, title: 'Encrypted Evidence Vault', desc: 'Store screenshots, documents, and receipts. Encrypted on your device before upload - we never see your files.', detail: 'Everything gets automatic timestamps and a visual timeline. When you need it, export a structured case file. Your data stays yours.', gradient: 'from-sky-400 to-blue-500' },
  { icon: FileText, title: 'Court-Ready Export', desc: 'One click: structured PDF with evidence index, timelines, and summaries. What lawyers actually ask for.', detail: 'Indian family law context built in. Formats that hold up. No spreadsheets, no chaos.', gradient: 'from-teal-400 to-emerald-500' },
]

const divorceFeatures = [
  { icon: Lock, title: 'Encrypted Evidence Vault', desc: 'Upload screenshots, documents, photos, and chat exports. Encrypted on your device before upload. Automatic timestamps and visual timeline.', detail: 'Everything is encrypted in your browser before it leaves your device. We cannot read your files. Build a chronological evidence timeline your lawyer can use.', gradient: 'from-sky-400 to-blue-500' },
  { icon: Brain, title: 'AI Chat Analysis', desc: 'Paste or upload conversations. AI identifies manipulation, gaslighting, financial threats, and key patterns.', detail: 'Our AI analyzes WhatsApp, SMS, and email conversations against Indian legal context. Get a risk score, categorized red flags, and a summary for your lawyer.', gradient: 'from-violet-400 to-purple-500' },
  { icon: TrendingUp, title: 'Income & Expense Tracker', desc: 'Log financial records for maintenance. Court-format affidavits following Rajnesh v. Neha guidelines.', detail: 'Designed for alimony and maintenance proceedings. Follows Supreme Court guidelines. Monthly income, expenses, disposable income calculations.', gradient: 'from-teal-400 to-emerald-500' },
  { icon: Gift, title: 'Dowry & DV Documentation', desc: 'Document gifts, transfers, and incidents. Witness management. Medical report organizer. Maintenance calculator.', detail: 'For women: Dowry Vault (gifts, cash, jewelry, property), DV Log (incidents with dates and evidence), Maintenance Calculator.', gradient: 'from-rose-400 to-pink-500' },
  { icon: FileText, title: 'Court-Ready PDF Export', desc: 'One click: structured case file with evidence index, conversation analysis, financial summaries.', detail: 'Export a comprehensive PDF with timeline, analysis summaries, and financial records. Admissible format. Your lawyer gets what they need, fast.', gradient: 'from-amber-400 to-orange-500' },
]

const stats = [
  { value: 2500, suffix: '+', label: 'Evidence files organized', icon: Shield },
  { value: 500, suffix: '+', label: 'Cases documented', icon: Scale },
  { value: 4.9, suffix: '/5', label: 'User satisfaction', icon: Star, isDecimal: true },
  { value: 2, suffix: ' min', label: 'Average setup time', icon: Zap },
]

const isThisForYou = [
  { icon: Scale, title: 'Going through a divorce or separation', desc: 'You need to organize months or years of conversations, financial records, and documents before your hearing.', color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', border: 'hover:border-blue-200' },
  { icon: FileText, title: 'Your lawyer asked for organized evidence', desc: 'They need a timeline, structured documents, and financial summaries - not a folder of screenshots.', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', border: 'hover:border-amber-200' },
  { icon: Clock, title: 'You want to be prepared, just in case', desc: "Things aren't great, and you want to start documenting now - before a situation escalates.", color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', border: 'hover:border-emerald-200' },
]

const showcaseFeatures = [
  {
    icon: Lock, demoVariant: 'vault' as const, alt: 'Encrypted Evidence Vault',
    title: 'Store Evidence Securely', accent: 'from-blue-500 to-cyan-500',
    desc: 'Upload screenshots, documents, photos, and chat exports. Everything is encrypted on your device and timestamped automatically. Build a visual timeline of all your evidence.',
    highlights: ['Encrypted before upload - even we can\'t read your files', 'Automatic timestamps for every file', 'Visual timeline to see your full history'],
  },
  {
    icon: Brain, demoVariant: 'chat' as const, alt: 'AI Chat Analyzer',
    title: 'Analyze Conversations with AI', accent: 'from-purple-500 to-pink-500',
    desc: 'Paste or upload WhatsApp, SMS, or email conversations. AI identifies important patterns, concerning language, and key moments - so you know what matters before your lawyer does.',
    highlights: ['Works with WhatsApp, SMS, email, and more', 'Highlights key moments and patterns', 'Generates a summary you can share with your lawyer'],
  },
  {
    icon: TrendingUp, demoVariant: 'income' as const, alt: 'Income & Expense Tracker',
    title: 'Track Income & Expenses', accent: 'from-emerald-500 to-teal-500',
    desc: 'Log your financial records for maintenance or alimony calculations. Follows court guidelines and generates formatted affidavits with one click.',
    highlights: ['Follows Rajnesh v. Neha court guidelines', 'One-click affidavit generation', 'Monthly income and expense trends'],
  },
]

const supportingFeatures = [
  { icon: Download, title: 'Export Case Files for Your Lawyer', desc: 'Generate a structured PDF with your evidence timeline, AI analysis summaries, and financial records - ready to hand to your lawyer.', accent: 'from-amber-500 to-orange-500' },
  { icon: MessageSquare, title: 'Works with Any Chat Format', desc: 'WhatsApp exports, SMS backups, iOS Messages, email threads - just upload or paste. The format is detected automatically.', accent: 'from-rose-500 to-red-500' },
  { icon: AlertTriangle, title: 'Document Incidents', desc: 'Record incidents with dates, descriptions, and attached evidence. Build a chronological log that holds up under scrutiny.', accent: 'from-indigo-500 to-violet-500' },
]

const howItWorks = [
  { num: '01', icon: Upload, title: 'Upload Your Evidence', desc: 'Add chats, screenshots, documents, and financial records. Everything is encrypted on your device and organized automatically.', demoVariant: 'vault' as const, imgAlt: 'Evidence vault upload interface', direction: 'left' as const, tags: ['WhatsApp', 'SMS', 'Email', 'Photos', 'Documents'] },
  { num: '02', icon: BarChart3, title: 'AI Organizes & Analyzes', desc: 'AI builds timelines, identifies important patterns in conversations, and calculates financial summaries - saving you hours of manual work.', demoVariant: 'chat' as const, imgAlt: 'AI chat analysis results', direction: 'right' as const },
  { num: '03', icon: Download, title: 'Share with Your Lawyer', desc: 'Export a structured case file as PDF - with evidence index, conversation analysis, and financial summaries. Your lawyer gets what they need, fast.', demoVariant: 'income' as const, imgAlt: 'Case file export', direction: 'left' as const },
]

const menFeatures = [
  { text: 'Encrypted evidence vault with visual timeline', icon: Lock },
  { text: 'Income & expense tracker with court-format affidavits', icon: TrendingUp },
  { text: 'AI conversation analysis and pattern detection', icon: Brain },
  { text: 'Structured breakup message drafting', icon: MessageSquare },
  { text: 'PDF case file export for your lawyer', icon: FileText },
]

const womenFeatures = [
  { text: 'Dowry documentation - gifts, receipts, transfers', icon: Gift },
  { text: 'Incident log with dates and evidence attachments', icon: AlertTriangle },
  { text: 'Maintenance calculator based on legal guidelines', icon: Scale },
  { text: 'Medical report organizer', icon: Heart },
  { text: 'PDF case file export for your lawyer', icon: FileText },
]

const securityCards = [
  { icon: Lock, title: 'Encrypted on Your Device', desc: 'Your files are encrypted in your browser before they ever leave your device. Even we cannot read them.', glow: 'hover:shadow-blue-500/10' },
  { icon: Fingerprint, title: 'Tamper-Proof Records', desc: 'Every file gets a unique digital fingerprint. If anything is altered, it shows immediately.', glow: 'hover:shadow-purple-500/10' },
  { icon: KeyRound, title: 'Only You Have the Key', desc: 'Your encryption key is derived from your account. We never store it, never see it, never have access.', glow: 'hover:shadow-emerald-500/10' },
  { icon: Server, title: 'Your Data, Only Yours', desc: 'Database-level policies ensure no one - not even our team - can access another user\'s data.', glow: 'hover:shadow-amber-500/10' },
]

const faqs = [
  { q: 'Is this legal advice?', a: 'No. Blue Drum AI is a documentation and organization tool - not a law firm. It helps you collect and structure your evidence so your lawyer can work more effectively. Always consult a qualified lawyer for legal advice specific to your situation.' },
  { q: 'Who is this for?', a: 'Anyone in India going through or preparing for a family dispute - divorce, separation, custody, maintenance, or domestic issues. We have dedicated tools for both men and women, covering different legal contexts like alimony, dowry, and DV documentation.' },
  { q: 'How is my data kept private?', a: 'Your files are encrypted on your device before upload - we literally cannot read them. Each account has its own encryption key, and database-level security ensures only you can access your records.' },
  { q: 'What chat formats can I upload?', a: 'WhatsApp exports (.txt), Android SMS backups (.csv), iOS Messages, email threads (.eml), and manual text paste. Just upload or paste - the format is detected automatically.' },
  { q: 'Is it really free?', a: 'Yes. The free plan includes the evidence vault (50 files), AI conversation analysis (5/month), income tracking, and PDF export. No credit card required. Premium (₹199/month) removes all limits.' },
  { q: 'Will my lawyer accept this?', a: 'Blue Drum AI generates structured PDFs with timestamped evidence, organized timelines, and financial summaries - exactly what lawyers ask clients to prepare. Many users report that their lawyers were impressed by the level of organization.' },
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
  const [activePersona, setActivePersona] = useState<'couples' | 'divorce'>('couples')
  const [expandedPersonaCard, setExpandedPersonaCard] = useState<number | null>(null)
  const [showSample, setShowSample] = useState(false)

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
                <div className="hidden sm:block text-xs text-gray-500 dark:text-gray-400">Organize your evidence. Strengthen your case.</div>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) =>
              l.type === 'link' ? (
                <Link
                  key={l.path}
                  to={l.path}
                  className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-primary-900/20 hover:text-gray-900 dark:hover:text-white"
                >
                  {l.label}
                </Link>
              ) : (
                <button key={l.id} onClick={() => scrollTo(l.id)} className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-primary-900/20 hover:text-gray-900 dark:hover:text-white">
                  {l.label}
                </button>
              )
            )}
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
                <button onClick={() => signOut().catch(() => {}).finally(() => navigate('/sign-in'))} className="rounded-lg border border-gray-200 dark:border-primary-500/20 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 transition hover:border-gray-300 dark:hover:border-primary-500/30">
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
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-blue-100/50 dark:border-gray-800 bg-white/95 dark:bg-black/95 backdrop-blur-sm px-5 pb-6 pt-4 lg:hidden">
            <div className="space-y-1">
              {navLinks.map((l) =>
                l.type === 'link' ? (
                  <Link
                    key={l.path}
                    to={l.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center rounded-xl px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-primary-900/20"
                  >
                    {l.label}
                  </Link>
                ) : (
                  <button
                    key={l.id}
                    onClick={() => { scrollTo(l.id); setMobileMenuOpen(false) }}
                    className="flex min-h-[44px] w-full items-center rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-primary-900/20"
                  >
                    {l.label}
                  </button>
                )
              )}
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
              {user ? (
                <>
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate('/dashboard') }}
                    className="flex min-h-[44px] items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => signOut().catch(() => {}).finally(() => { setMobileMenuOpen(false); navigate('/sign-in') })}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-gray-200 dark:border-primary-500/30 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-gray-200 dark:border-primary-500/30 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/sign-up"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────────── HERO ────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Base background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-blue-50/30 to-white dark:from-[#08090e] dark:via-[#0c0f1a] dark:to-[#08090e]" />
        {/* Soft ambient blobs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[700px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary-100/60 via-blue-50/40 to-transparent dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-transparent blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-gradient-to-tl from-indigo-100/30 to-transparent dark:from-indigo-900/15 dark:to-transparent blur-3xl" />
        {/* Grid line pattern */}
        <div className="pointer-events-none hero-grid-pattern absolute inset-0" />
        {/* Fade edges so grid doesn't have hard cuts */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/50 dark:from-[#08090e]/70 dark:via-transparent dark:to-[#08090e]/70" />

        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-16 sm:pb-24 sm:pt-24 md:pb-28 md:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <BlurIn delay={0.1}>
              <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-primary-200/80 dark:border-primary-700/50 bg-primary-50/80 dark:bg-primary-900/30 px-4 py-2 text-xs font-semibold text-primary-700 dark:text-primary-300 shadow-sm transition-all hover:shadow-md hover:bg-primary-100/80 dark:hover:bg-primary-800/40 cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-primary-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
                </span>
                For people navigating family disputes in India
              </div>
            </BlurIn>

            <BlurIn delay={0.25}>
              <h1 className="text-[2.25rem] font-extrabold leading-[1.12] tracking-tight sm:text-5xl md:text-6xl lg:text-[4.25rem]">
                <span className="block w-full sm:whitespace-nowrap">Your evidence is everywhere.</span>
                <span className="animate-gradient-text bg-gradient-to-r from-primary-600 via-blue-500 to-indigo-600">Your lawyer</span>{' '}
                <WordRotate
                  words={['needs it in one place.', 'needs it organized.', 'needs it structured.', 'needs it now.']}
                  duration={3500}
                  className="inline-flex"
                />
              </h1>
            </BlurIn>

            <BlurIn delay={0.45}>
              <p className="mx-auto mt-6 max-w-2xl px-4 sm:px-0 text-base leading-relaxed text-gray-500 dark:text-gray-400 sm:text-lg md:text-xl">
                Blue Drum AI helps you collect your chats, documents, and financial records - then
                organizes them into a structured case file your lawyer can actually use.
                <span className="font-medium text-gray-700 dark:text-gray-200"> No legal knowledge required.</span>
              </p>
            </BlurIn>

            <BlurIn delay={0.6}>
              <div className="mt-10 sm:mt-9 flex flex-col items-center justify-center gap-3 px-4 sm:px-0 sm:flex-row sm:flex-wrap">
                <Link to="/sign-up" className="w-full sm:w-auto">
                  <ShimmerButton className="w-full sm:w-auto">
                    Get Started Free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </ShimmerButton>
                </Link>
                <button
                  onClick={() => setShowSample(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary-200 dark:border-primary-500/30 bg-primary-50/80 dark:bg-primary-900/30 px-6 py-3 text-sm font-semibold text-primary-700 dark:text-primary-300 shadow-sm transition-all hover:border-primary-300 dark:hover:border-primary-500/50 hover:shadow-md sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                >
                  <FileText className="h-4 w-4" />
                  See a Sample Case File
                </button>
                
              </div>
            </BlurIn>

            <BlurIn delay={0.75}>
              <p className="mt-5 text-xs text-gray-400 dark:text-gray-500">Free plan available - no credit card needed</p>
            </BlurIn>
          </div>

          {/* Dashboard demo UI */}
          <div className="fade-in-up visible relative mx-auto mt-14 max-w-5xl sm:mt-18">
            {/* Radial glow behind screenshot */}
            <div className="pointer-events-none absolute -inset-12 -z-10">
              <div className="absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-400/20 via-primary-500/15 to-indigo-400/10 blur-[100px] dark:from-blue-500/15 dark:via-primary-500/10 dark:to-indigo-500/8" />
            </div>
            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/40 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/40 dark:to-gray-900/60 p-1.5 shadow-2xl shadow-gray-300/30 dark:shadow-blue-900/20">
              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/30">
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
            <div className="animate-float absolute -left-4 top-16 hidden rounded-2xl border border-white/80 dark:border-gray-700/40 bg-white/90 dark:bg-gray-900/80 px-5 py-3.5 shadow-xl dark:shadow-blue-900/10 backdrop-blur lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">Fully Encrypted</div>
                  <div className="text-xs text-gray-400">Files protected on your device</div>
                </div>
              </div>
            </div>

            {/* Floating badge: AI Analysis */}
            <div className="animate-float-delayed absolute -right-4 top-24 hidden rounded-2xl border border-white/80 dark:border-gray-700/40 bg-white/90 dark:bg-gray-900/80 px-5 py-3.5 shadow-xl dark:shadow-blue-900/10 backdrop-blur lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-md">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">AI-Powered Insights</div>
                  <div className="text-xs text-gray-400">Key patterns found instantly</div>
                </div>
              </div>
            </div>

            {/* Floating badge: PDF Export */}
            <div className="animate-float absolute -left-2 bottom-12 hidden rounded-2xl border border-white/80 dark:border-gray-700/40 bg-white/90 dark:bg-gray-900/80 px-4 py-3 shadow-xl dark:shadow-blue-900/10 backdrop-blur lg:block" style={{ animationDelay: '0.8s' }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">Lawyer-Ready Export</div>
                  <div className="text-xs text-gray-400">Structured PDF case files</div>
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
            { icon: Lock, text: 'Encrypted on your device' },
            { icon: Shield, text: 'Only you can access your files' },
            { icon: Scale, text: 'Built for Indian family law' },
            { icon: Brain, text: 'AI organizes your evidence' },
            { icon: FileText, text: 'PDF case files for your lawyer' },
            { icon: Fingerprint, text: 'Tamper-proof records' },
            { icon: Users, text: 'Tools for both men and women' },
            { icon: Sparkles, text: 'Works with WhatsApp, SMS, and email' },
          ].map((item) => (
            <div key={item.text} className="mx-4 flex items-center gap-2 text-sm font-medium text-gray-400">
              <item.icon className="h-4 w-4 text-primary-400/60" />
              {item.text}
            </div>
          ))}
        </Marquee>
      </section>

      {/* ──────────────── WHO IS IT FOR? (Tabbed) ─────────────────── */}
      <section id="who-is-it-for" className="py-14 sm:py-24">
        <div className="mx-auto max-w-4xl px-5">
          <div className="text-center">
            <FadeIn><SectionLabel>Who Is It For?</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-2xl font-bold tracking-tight sm:text-4xl dark:text-white">
                Built for two very different situations
              </h2>
            </FadeIn>
          </div>

          {/* Tab Switcher */}
          <FadeIn delay={0.2}>
            <div className="mx-auto mt-8 flex max-w-sm overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 p-1">
              <button
                onClick={() => { setActivePersona('couples'); setExpandedPersonaCard(null) }}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                  activePersona === 'couples'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
                Couples
              </button>
              <button
                onClick={() => { setActivePersona('divorce'); setExpandedPersonaCard(null) }}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                  activePersona === 'divorce'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Scale className="mr-1.5 inline h-3.5 w-3.5" />
                Divorce
              </button>
            </div>
          </FadeIn>

          {/* Tab Content */}
          <div className="mt-8">
            {/* Tagline */}
            <div className="mb-6 text-center">
              {activePersona === 'couples' ? (
                <h3 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                  Be prepared, <span className="bg-gradient-to-r from-sky-600 to-violet-600 bg-clip-text text-transparent">not blindsided.</span>
                </h3>
              ) : (
                <h3 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                  Your evidence is scattered. <span className="bg-gradient-to-r from-sky-600 to-violet-600 bg-clip-text text-transparent">Get it organized.</span>
                </h3>
              )}
            </div>

            {/* "Is this for you?" - compact checklist */}
            <div className="mb-8 rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-4 sm:p-5">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Is this for you?</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(activePersona === 'couples' ? couplesWhoIsFor : divorceWhoIsFor).map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Features - compact list */}
            <div className="space-y-2">
              {(activePersona === 'couples' ? couplesFeatures : divorceFeatures).map((f, i) => (
                <div
                  key={i}
                  className={`overflow-hidden rounded-xl border transition-all duration-300 ${
                    expandedPersonaCard === i
                      ? 'border-primary-300 dark:border-primary-600 bg-white dark:bg-gray-800 shadow-md'
                      : 'border-gray-200/80 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 hover:border-primary-200 dark:hover:border-primary-500/30'
                  }`}
                >
                  <button
                    onClick={() => setExpandedPersonaCard(expandedPersonaCard === i ? null : i)}
                    className="flex w-full items-center gap-3 p-3.5 sm:p-4 text-left"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${f.gradient} shadow-sm`}>
                      <f.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-semibold text-gray-800 dark:text-white">{f.title}</h5>
                      <p className="mt-0.5 hidden text-xs text-gray-500 dark:text-gray-400 sm:block">{f.desc}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-300 ${expandedPersonaCard === i ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedPersonaCard === i && (
                    <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-4 pt-2.5">
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:hidden">{f.desc}</p>
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 mt-1 sm:mt-0">{f.detail}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8 text-center">
              <Link
                to="/sign-up"
                className="group inline-flex items-center gap-2 rounded-xl bg-primary-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-700 hover:shadow-xl sm:px-8 sm:py-4 sm:text-base"
              >
                Get Started Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── IS THIS FOR YOU? ─────────────────────────── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-3xl text-center">
            <FadeIn><SectionLabel>Is This For You?</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl dark:text-white">
                Blue Drum AI is built for people who need to get organized - fast
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-5 text-base leading-relaxed text-gray-500 dark:text-gray-400 sm:text-lg">
                Whether you&apos;re already working with a lawyer or just starting to prepare,
                having structured evidence makes everything easier.
              </p>
            </FadeIn>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
            {isThisForYou.map((p, i) => (
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

      {/* ──────────────────────── SEE IT IN ACTION ──────────────────────── */}
      <section className="border-t border-blue-100/40 dark:border-gray-800 py-20 sm:py-28 overflow-hidden">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <FadeIn><SectionLabel>See It In Action</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl dark:text-white">
                Paste a conversation. AI does the rest.
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-base text-gray-500 dark:text-gray-400 sm:text-lg">
                Here&apos;s what happens when you upload a WhatsApp chat to Blue Drum AI.
              </p>
            </FadeIn>
          </div>

          <FadeIn delay={0.3}>
            <div className="mx-auto mt-14 max-w-4xl grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Simulated Chat */}
              <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700 bg-white dark:bg-black shadow-lg overflow-hidden">
                <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">WhatsApp Chat Export</span>
                </div>
                <div className="p-4 space-y-3 text-sm font-mono">
                  {[
                    { time: '9:15 AM', sender: 'Priya', msg: 'Can we discuss the maintenance? Haven\'t heard back in a week.', flag: false },
                    { time: '9:18 AM', sender: 'Rahul', msg: 'I told you I can\'t afford more than 15k. Stop asking.', flag: false },
                    { time: '9:21 AM', sender: 'Rahul', msg: 'Court order doesn\'t matter. I have nothing.', flag: true },
                    { time: '9:24 AM', sender: 'Rahul', msg: 'Keep pushing and you\'ll regret it.', flag: true },
                    { time: '9:26 AM', sender: 'Rahul', msg: 'I\'m done being nice about this.', flag: true },
                  ].map((m, i) => (
                    <div key={i} className={`rounded-lg p-2.5 ${m.flag ? 'bg-red-50 dark:bg-red-900/15 border border-red-200/60 dark:border-red-800/30' : 'bg-gray-50 dark:bg-gray-900'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-gray-400">{m.time}</span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{m.sender}</span>
                        {m.flag && <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-[9px] font-bold text-red-600 dark:text-red-400">AI FLAGGED</span>}
                      </div>
                      <p className={`text-xs ${m.flag ? 'text-red-800 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'}`}>{m.msg}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Analysis Output */}
              <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700 bg-white dark:bg-black shadow-lg overflow-hidden">
                <div className="border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 px-4 py-2.5 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">AI Analysis Result</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Risk Score</span>
                    <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-sm font-bold text-amber-700 dark:text-amber-400">68 / 100</span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Findings</p>
                    <div className="space-y-2">
                      {[
                        'Threatening language detected in 3 messages',
                        'Financial non-compliance - contradicts court order',
                        'Escalating tone across the conversation',
                      ].map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <span className="text-gray-600 dark:text-gray-400">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">AI Summary</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      Pattern of intimidation with financial pressure as a recurring theme. Three statements may be relevant for legal proceedings.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    <span>Added to your case file automatically</span>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="mt-10 text-center">
              <Link to="/sign-up" className="group inline-flex items-center gap-2 text-sm font-bold text-primary-600 transition-colors hover:text-primary-700">
                Try it with your own conversations <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ──────────────────────── FEATURES SHOWCASE ──────────────────────── */}
      <section id="features" className="border-t border-blue-100/40 dark:border-gray-800 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <FadeIn><SectionLabel>What You Can Do</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl dark:text-white">
                Everything you need to build a structured case
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-base text-gray-500 dark:text-gray-400 sm:text-lg">
                Upload your evidence, let AI organize it, and hand your lawyer a case file they can work with immediately.
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
                  {/* Demo UI - 3 cols */}
                  <div className="lg:col-span-3">
                    <div className="overflow-hidden rounded-2xl border border-gray-200/70 dark:border-primary-500/20 bg-gradient-to-b from-gray-50 to-white dark:from-primary-900/20 dark:to-black/50 p-1 shadow-2xl shadow-gray-300/30 dark:shadow-primary-900/10">
                      <BrowserChrome />
                      <DemoMock variant={item.demoVariant} className="min-h-[320px]" />
                    </div>
                  </div>

                  {/* Description - 2 cols */}
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
              <h3 className="mb-8 text-center text-lg font-bold text-gray-900 dark:text-white">And more tools to help you prepare</h3>
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
                From scattered files to a structured case - in minutes
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-base text-gray-500 dark:text-gray-400 sm:text-lg">
                No technical knowledge needed. Just upload, let AI do the heavy lifting, and share with your lawyer.
              </p>
            </FadeIn>
          </div>

          <div className="mx-auto mt-16 max-w-5xl space-y-16">
            {howItWorks.map((s, i) => (
              <FadeIn key={s.num} delay={0.1 * i} direction={s.direction === 'right' ? 'right' : 'left'}>
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
                {/* Demo UI */}
                <div className={s.direction === 'right' ? 'lg:order-2' : ''}>
                  <div className="overflow-hidden rounded-2xl border border-gray-200/60 dark:border-primary-500/20 shadow-xl shadow-gray-200/30 dark:shadow-primary-900/10">
                    <DemoMock variant={s.demoVariant} className="min-h-[280px] sm:min-h-[340px]" />
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
            <div className="mt-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/sign-up" className="group inline-flex items-center gap-2.5 rounded-xl bg-gray-900 dark:bg-white px-8 py-4 text-base font-bold text-white dark:text-gray-900 shadow-xl transition-all duration-300 hover:bg-gray-800 dark:hover:bg-gray-100 hover:shadow-2xl">
                Get Started Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <button
                onClick={() => setShowSample(true)}
                className="group inline-flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black px-8 py-4 text-base font-semibold text-gray-700 dark:text-gray-300 shadow-sm transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
              >
                <FileText className="h-4 w-4 text-primary-500" />
                See a Sample Case File
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      <SampleCasePreview open={showSample} onClose={() => setShowSample(false)} />

      {/* ──────────────────────── MODULES ─────────────────────────────────── */}
      <section className="border-t border-blue-100/40 dark:border-gray-800 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <FadeIn><SectionLabel>Built for Both Sides</SectionLabel></FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl dark:text-white">
                Dedicated tools for your specific situation
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-base text-gray-500 dark:text-gray-400 sm:text-lg">
                Different legal contexts need different tools. We have specialized features for both men and women navigating family disputes.
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
                      <p className="text-xs text-gray-400">Evidence organization & financial documentation</p>
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
                  <DemoMock variant="income" className="min-h-[280px] sm:min-h-[340px]" />
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
                      <p className="text-xs text-gray-400">Incident documentation & financial tracking</p>
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
                  <DemoMock variant="vault" className="min-h-[280px] sm:min-h-[340px]" />
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
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.15em] text-primary-400">Your Privacy</p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 ring-1 ring-primary-500/30">
                <Shield className="h-8 w-8 text-primary-400" />
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Your files are private. Even from us.</h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-base text-gray-400 sm:text-lg">
                Everything is encrypted on your device before it leaves your browser. We designed it so that even our own team cannot access your files.
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
            {['Enterprise-grade encryption', 'GDPR-compliant design', 'Database-level access control', 'No third-party data sharing'].map((b) => (
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
                {['Encrypted vault - 50 files, 100 MB', '5 AI analyses / month', '3 PDF exports / month', '3 Breakup Generator uses / month', 'Red Flag Experience - 3 sessions / month'].map((x) => (
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
                {['Everything in Free', 'Unlimited vault storage - 5 GB', 'Unlimited AI analyses', 'Unlimited PDF exports', 'Unlimited Breakup Generator', 'Unlimited Red Flag sessions', 'Priority support'].map((x) => (
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
          <div className="fade-in-up relative mx-auto max-w-6xl rounded-3xl p-[2px] bg-gradient-to-r from-blue-200 via-blue-100 to-yellow-100/80">
            <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-blue-100 via-white/90 to-yellow-50/60 dark:from-primary-900/20 dark:via-black/80 dark:to-black/50 px-8 py-20 text-center md:px-16">
              <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-yellow-100/40 blur-3xl" />

              <h2 className="relative text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl md:text-5xl">
                Your lawyer needs organized evidence.
                <br className="hidden sm:block" />
                <span className="mt-2 block text-primary-600 sm:mt-3">Let&apos;s get you ready.</span>
              </h2>
              <p className="relative mx-auto mt-5 max-w-xl text-base text-gray-500 dark:text-gray-400 sm:text-lg">
                Create a free account, upload your first document, and see how Blue Drum AI turns your scattered files into a structured case file.
              </p>
              <div className="relative mt-5 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                <Sparkles className="h-4 w-4 text-primary-500" />
                Takes less than 2 minutes to get started
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
                  <div className="text-xs text-gray-400">Organize your evidence. Strengthen your case.</div>
                </div>
              </Link>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary-400" /> Encrypted on your device
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-primary-400" /> Private by design
                </span>
              </div>
            </div>

            <nav className="flex flex-wrap gap-6 text-sm text-gray-500 dark:text-gray-400">
              {navLinks.map((l) =>
                l.type === 'link' ? (
                  <Link key={l.path} to={l.path} className="transition-colors hover:text-gray-900 dark:hover:text-white">
                    {l.label}
                  </Link>
                ) : (
                  <button key={l.id} onClick={() => scrollTo(l.id)} className="transition-colors hover:text-gray-900 dark:hover:text-white">
                    {l.label}
                  </button>
                )
              )}
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
