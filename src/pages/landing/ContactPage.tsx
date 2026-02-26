import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, ArrowRight, Send, HelpCircle, Bug, Lightbulb, Shield, Lock } from 'lucide-react'
import { LandingNav } from '../../components/landing/LandingNav'

const topicOptions = [
  { value: 'general', label: 'General Question', icon: HelpCircle },
  { value: 'bug', label: 'Report a Bug', icon: Bug },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb },
  { value: 'partnership', label: 'Partnership / Press', icon: MessageSquare },
]

declare global {
  interface Window { $crisp?: Array<unknown[]> }
}

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', topic: 'general', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (window.$crisp) {
      window.$crisp.push(['do', 'message:send', ['text', `[Contact Form]\nName: ${form.name}\nTopic: ${form.topic}\n\n${form.message}`]])
      window.$crisp.push(['do', 'chat:open'])
    }
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50/30 to-white dark:from-black dark:via-black dark:to-black text-gray-900 dark:text-gray-100 antialiased font-sans transition-colors duration-300">
      <LandingNav />

      <section className="px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.15em] text-primary-500">Contact Us</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              We'd love to hear from you
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray-500 dark:text-gray-400 sm:text-lg">
              Have a question, found a bug, or want to share an idea? Reach out and we'll get back to you.
            </p>
          </div>

          {/* Contact form */}
          <div className="mt-12 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 p-6 shadow-sm sm:p-8">
            {submitted ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                  <Send className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Message sent!</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">We'll get back to you as soon as possible.</p>
                <button onClick={() => { setSubmitted(false); setForm({ name: '', topic: 'general', message: '' }) }} className="mt-6 text-sm font-medium text-primary-600 hover:text-primary-700">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Send us a message</h3>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-800 bg-white dark:bg-black px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Topic</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {topicOptions.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setForm({ ...form, topic: t.value })}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                          form.topic === t.value
                            ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm'
                            : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        <t.icon className="h-3.5 w-3.5" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-800 bg-white dark:bg-black px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Tell us what's on your mind..."
                  />
                </div>

                <button
                  type="submit"
                  className="group inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-primary-700"
                >
                  Send Message <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </form>
            )}
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
