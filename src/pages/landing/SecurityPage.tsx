import { Link } from 'react-router-dom'
import {
  Lock,
  Shield,
  Fingerprint,
  KeyRound,
  Server,
  Eye,
  FileText,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Database,
} from 'lucide-react'
import { LandingNav } from '../../components/landing/LandingNav'

const pillars = [
  {
    icon: Lock,
    title: 'Client-Side Encryption',
    desc: 'Your files are encrypted in your browser using AES-256 before they ever leave your device. The encrypted data is what gets stored. Even our servers only see gibberish.',
    gradient: 'from-primary-500 to-primary-700',
    details: [
      'AES-256 encryption performed in your browser',
      'Encryption key derived from your account credentials',
      'Raw files never touch our servers',
      'Decryption only happens on your device',
    ],
  },
  {
    icon: Fingerprint,
    title: 'Tamper-Proof Records',
    desc: 'Every file you upload gets a unique digital fingerprint (SHA-256 hash). If anything is altered - even a single pixel - the fingerprint changes and the tampering is immediately detectable.',
    gradient: 'from-violet-500 to-purple-500',
    details: [
      'SHA-256 hash generated for every file',
      'Automatic timestamps on all uploads',
      'Integrity verification on download',
      'Audit trail for all file operations',
    ],
  },
  {
    icon: KeyRound,
    title: 'Only You Have the Key',
    desc: 'Your encryption key is derived from your account and never leaves your device. We never store it, transmit it, or have any way to access it. If we wanted to read your files, we literally could not.',
    gradient: 'from-emerald-500 to-teal-500',
    details: [
      'Zero-knowledge architecture',
      'Key derivation happens locally',
      'No master key or backdoor exists',
      'Even our team cannot decrypt your data',
    ],
  },
  {
    icon: Server,
    title: 'Database-Level Isolation',
    desc: 'Row-Level Security (RLS) policies ensure every database query is scoped to your user ID. No one - not even our engineering team - can accidentally or intentionally access another user\'s records.',
    gradient: 'from-amber-500 to-orange-500',
    details: [
      'Supabase Row-Level Security enforced',
      'Every query filtered by authenticated user',
      'No admin override or bulk access',
      'Isolated storage per account',
    ],
  },
]

const practices = [
  { icon: Globe, title: 'HTTPS Everywhere', desc: 'All data in transit is encrypted with TLS 1.3. No exceptions.' },
  { icon: Eye, title: 'No Tracking or Ads', desc: 'We don\'t sell your data. No third-party analytics trackers or ad networks.' },
  { icon: Database, title: 'Minimal Data Collection', desc: 'We only collect what\'s needed to run the product. No unnecessary personal information.' },
  { icon: ShieldCheck, title: 'Regular Security Reviews', desc: 'Our codebase and infrastructure are reviewed for vulnerabilities on a regular basis.' },
  { icon: FileText, title: 'Transparent Practices', desc: 'No hidden data sharing. What you see is what you get. We\'ll always be upfront about how your data is handled.' },
  { icon: Shield, title: 'Indian Data Residency', desc: 'Your data is stored on servers with strong data protection practices, designed with Indian legal context in mind.' },
]

const faqs = [
  { q: 'Can Blue Drum AI read my files?', a: 'No. Your files are encrypted in your browser before upload. We receive and store only the encrypted version. We do not have the decryption key and cannot read your files under any circumstance.' },
  { q: 'What happens if Blue Drum AI gets hacked?', a: 'Even in that worst-case scenario, attackers would only get encrypted data. Without your personal encryption key (which only exists on your device), the data is useless.' },
  { q: 'Do you share data with third parties?', a: 'No. We do not sell, share, or provide your data to any third party. The only exception is infrastructure providers (hosting, database) who process encrypted data and have no way to read it.' },
  { q: 'Can law enforcement request my data?', a: 'We would comply with valid legal orders, but we can only provide encrypted data. Since we don\'t hold your encryption key, we cannot decrypt your files for anyone.' },
  { q: 'What about AI analysis - is my chat data stored?', a: 'Chat text you paste for AI analysis is sent to our AI processing endpoint, analyzed, and the results are stored in your account. The raw chat text is not permanently stored on our servers after analysis.' },
  { q: 'How do I delete my data?', a: 'You can delete individual files, analyses, or your entire account from the settings page. Deletion is permanent and irreversible.' },
]

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50/30 to-white dark:from-black dark:via-black dark:to-black text-gray-900 dark:text-gray-100 antialiased font-sans transition-colors duration-300">
      <LandingNav />

      {/* Hero */}
      <section className="px-5 pt-16 pb-14 sm:pt-24 sm:pb-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/25">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.15em] text-primary-500">Security & Privacy</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Your data is yours. Period.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-gray-500 dark:text-gray-400 sm:text-lg">
            Blue Drum AI handles sensitive, personal information. We built our security architecture around one principle: <span className="font-semibold text-gray-700 dark:text-gray-200">we should never be able to access your data, even if we wanted to.</span>
          </p>
        </div>
      </section>

      {/* Four Pillars */}
      <section className="px-5 pb-16 sm:pb-24">
        <div className="mx-auto max-w-5xl space-y-6">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900/80 p-6 shadow-sm transition-all hover:shadow-md sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${p.gradient} shadow-md`}>
                  <p.icon className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{p.title}</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300 leading-relaxed">{p.desc}</p>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {p.details.map((d) => (
                      <div key={d} className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Additional Practices */}
      <section className="border-y border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-black/60 px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Additional Security Practices</h2>
          <p className="mt-3 text-center text-gray-500 dark:text-gray-400">Beyond encryption, here's how we keep your data safe.</p>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {practices.map((p) => (
              <div key={p.title} className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-5 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{p.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Security FAQ</h2>
          <p className="mt-3 text-center text-gray-500 dark:text-gray-400">Common questions about how we protect your data.</p>
          <div className="mt-10 space-y-3">
            {faqs.map((f, i) => (
              <details key={i} className="group rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900/80 overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 list-none select-none hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                  <span className="text-sm font-semibold text-gray-800 dark:text-white">{f.q}</span>
                  <svg className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="border-t border-gray-100 dark:border-gray-800 px-5 pb-4 pt-3">
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{f.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20 sm:pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Ready to get started?</h2>
          <p className="mt-3 text-gray-500 dark:text-gray-400">Your data stays yours. Always.</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/sign-up"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-700 sm:w-auto"
            >
              Get Started Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/contact" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Have questions? Contact us
            </Link>
          </div>
        </div>
      </section>

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
              <Link to="/" className="transition-colors hover:text-gray-900 dark:hover:text-white">Home</Link>
              <Link to="/security" className="transition-colors hover:text-gray-900 dark:hover:text-white">Security</Link>
              <Link to="/contact" className="transition-colors hover:text-gray-900 dark:hover:text-white">Contact</Link>
              <a href="/#pricing" className="transition-colors hover:text-gray-900 dark:hover:text-white">Pricing</a>
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
