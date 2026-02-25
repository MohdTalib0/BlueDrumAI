import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Moon, Sun } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useDarkMode } from '../../hooks/useDarkMode'

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Who Is It For', path: '/#who-is-it-for' },
  { label: 'What You Can Do', path: '/#features' },
  { label: 'How It Works', path: '/#how-it-works' },
  { label: 'Privacy', path: '/#security' },
  { label: 'Pricing', path: '/#pricing' },
]

export function LandingNav() {
  const { user, signOut } = useAuth()
  const { dark, toggle: toggleDark } = useDarkMode()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname === path
  }

  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b border-sky-100/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-sm shadow-sky-100/20 dark:shadow-black/20">
      <div className="flex w-full items-center justify-between px-5 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Blue Drum AI" className="h-8 w-8 sm:h-10 sm:w-10" />
          <div className="leading-tight">
            <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-white">Blue Drum AI</div>
            <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">Your digital legal shield</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) =>
            item.path.startsWith('/#') ? (
              <a
                key={item.path}
                href={item.path}
                className={`rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  isActive(item.path) ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {user ? (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="hidden rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-sky-700 sm:inline-flex"
              >
                Dashboard
              </button>
              <button
                onClick={() => signOut().catch(() => {}).finally(() => navigate('/sign-in'))}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/sign-in" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 sm:inline-flex">
                Sign in
              </Link>
              <Link
                to="/sign-up"
                className="group inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-sky-700"
              >
                Get Started <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="ml-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                aria-label="Menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 pb-6 pt-4 lg:hidden">
          <div className="space-y-1">
            {navItems.map((item) =>
              item.path.startsWith('/#') ? (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center rounded-xl px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex min-h-[44px] items-center rounded-xl px-4 py-3 text-sm font-medium ${isActive(item.path) ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  {item.label}
                </Link>
              )
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 dark:border-slate-700 pt-4">
            {user ? (
              <>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/dashboard') }}
                  className="flex min-h-[44px] items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => signOut().catch(() => {}).finally(() => { setMobileMenuOpen(false); navigate('/sign-in') })}
                  className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300"
                >
                  Sign in
                </Link>
                <Link
                  to="/sign-up"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
