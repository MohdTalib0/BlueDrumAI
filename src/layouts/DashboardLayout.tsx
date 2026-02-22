import { ReactNode, useMemo, useRef, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, LogOut, Clock4, Menu, X, TrendingUp, AlertTriangle, History, ArrowLeft, Gift, ShieldAlert, Calculator, MessageSquare, UserCircle, User, MessageCircle, HelpCircle, Bug, Sparkles, Wrench, AlertCircle, MessageSquarePlus, Send, Crown, FileText, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth, type UserGender } from '../context/AuthContext'
import { getEdgeFunctionUrl } from '../lib/api'
import { useDarkMode } from '../hooks/useDarkMode'

interface Props {
  children: ReactNode
  title?: string
  subtitle?: string
  rightActions?: ReactNode
  backHref?: string
}

type ModuleAccess = 'all' | 'male' | 'female'

function canAccess(itemAccess: ModuleAccess, gender: UserGender): boolean {
  if (itemAccess === 'all') return true
  if (!gender || gender === 'both') return true
  return itemAccess === gender
}

export function DashboardLayout({ children, title = 'Dashboard', subtitle, rightActions, backHref }: Props) {
  const { user, signOut, sessionToken } = useAuth()
  const { dark, toggle: toggleDark } = useDarkMode()
  const navigate = useNavigate()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Help modal state
  const [helpOpen, setHelpOpen] = useState(false)

  // Feedback modal state
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'improvement' | 'other'>('improvement')
  const [feedbackTitle, setFeedbackTitle] = useState('')
  const [feedbackDesc, setFeedbackDesc] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)

  function openFeedback() {
    setFeedbackOpen(true)
    setFeedbackType('improvement')
    setFeedbackTitle('')
    setFeedbackDesc('')
    setFeedbackSent(false)
  }

  function closeFeedback() {
    setFeedbackOpen(false)
  }

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionToken) return
    setFeedbackSending(true)
    try {
      const res = await fetch(`${getEdgeFunctionUrl('auth')}/feedback`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: feedbackType, title: feedbackTitle.trim(), description: feedbackDesc.trim() }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed to send')
      setFeedbackSent(true)
    } catch (err: any) {
      toast.error(err?.message || 'Could not send feedback. Please try again.')
    } finally {
      setFeedbackSending(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenuOpen])

  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    : user?.email?.split('@')[0] || 'Account'

  const allNavItems: { label: string; icon: typeof Home; href: string; access: ModuleAccess }[] = useMemo(
    () => [
      { label: 'Dashboard', icon: Home, href: '/dashboard', access: 'all' },
      { label: 'Vault Timeline', icon: Clock4, href: '/dashboard/vault/timeline', access: 'all' },
      { label: 'Red Flag Radar', icon: AlertTriangle, href: '/dashboard/red-flag-radar', access: 'all' },
      { label: 'Analysis History', icon: FileText, href: '/dashboard/red-flag-radar/history', access: 'all' },
      { label: 'Income Tracker', icon: TrendingUp, href: '/dashboard/income-tracker', access: 'male' },
      { label: 'Income History', icon: History, href: '/dashboard/income-tracker/history', access: 'male' },
      { label: 'Dowry Vault', icon: Gift, href: '/dashboard/dowry-vault', access: 'female' },
      { label: 'DV Log', icon: ShieldAlert, href: '/dashboard/dv-log', access: 'female' },
      { label: 'Maintenance', icon: Calculator, href: '/dashboard/maintenance', access: 'female' },
      { label: 'Breakup Generator', icon: MessageSquare, href: '/dashboard/breakup-generator', access: 'male' },
      { label: 'Subscription', icon: Crown, href: '/dashboard/subscription', access: 'all' },
      { label: 'My Profile', icon: UserCircle, href: '/dashboard/profile', access: 'all' },
    ],
    []
  )

  const navItems = useMemo(
    () => allNavItems.filter(item => canAccess(item.access, user?.gender ?? null)),
    [allNavItems, user?.gender]
  )

  const activeHref = useMemo(() => {
    const matches = navItems.filter(item => {
      if (item.href === '/dashboard')
        return location.pathname === '/dashboard' || location.pathname === '/dashboard/'
      return location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    })
    return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? ''
  }, [location.pathname, navItems])

  return (
    <div className="min-h-screen w-full min-w-0 bg-gradient-to-br from-blue-50 via-yellow-50/30 to-white dark:from-black dark:via-black dark:to-black flex font-sans relative overflow-x-hidden transition-colors duration-300">
      {/* Decorative gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 via-transparent to-yellow-100/20 dark:from-transparent dark:to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-200/10 dark:bg-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/10 dark:bg-transparent rounded-full blur-3xl pointer-events-none" />
      
      {/* Top brand bar (also for private pages) */}
      <div className="fixed inset-x-0 top-0 z-50 border-b border-blue-100/50 dark:border-gray-800 backdrop-blur-sm bg-gradient-to-br from-blue-50/40 via-yellow-50/20 to-white/40 dark:from-black dark:via-black dark:to-black">
        <div className="flex w-full items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 touch-manipulation"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center">
                <img src="/logo.svg" alt="Blue Drum AI" className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">Blue Drum AI</div>
                <div className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 truncate">Evidence-based legal vigilance</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">

            <button
              onClick={toggleDark}
              title="Toggle dark mode"
              className="p-1.5 sm:p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors"
            >
              {dark ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>

            <button
              onClick={() => setHelpOpen(true)}
              title="Help"
              className="p-1.5 sm:p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white cursor-pointer transition-colors"
            >
              <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Subscription / Crown */}
            <button
              onClick={() => navigate('/dashboard/subscription')}
              title="Subscription"
              className="p-1.5 sm:p-2 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer transition-colors"
            >
              <Crown className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* User menu dropdown */}
            <div className="relative" ref={userMenuRef}>
              {/* Ghost trigger — just the name */}
              <button
                onClick={() => setUserMenuOpen(prev => !prev)}
                className="h-9 px-3 flex items-center text-sm font-medium bg-transparent border-none text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer -tracking-[.08em] rounded-lg"
                aria-haspopup="dialog"
                aria-expanded={userMenuOpen}
              >
                <span className="text-sm font-semibold">{displayName}</span>
              </button>

              {/* Floating panel */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 rounded-xl overflow-hidden shadow-xl border border-white/20 dark:border-primary-500/20 z-[100]"
                  style={{ backdropFilter: 'blur(12px)' }}
                >
                  <div className="px-4 py-2 text-right bg-gradient-to-b from-gray-100/80 via-gray-50/60 to-transparent dark:from-black dark:via-black dark:to-transparent backdrop-blur-md">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</div>
                  </div>

                  <div className="p-4 bg-white/80 dark:bg-black backdrop-blur-md">
                    <div className="space-y-1">
                      <button
                        onClick={() => { navigate('/dashboard/profile'); setUserMenuOpen(false) }}
                        className="gap-2 bg-transparent w-full flex items-center justify-start space-x-2 px-2 py-1 rounded-md hover:bg-gray-900/10 dark:hover:bg-gray-900 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white -tracking-[.08em] text-left cursor-pointer"
                      >
                        <User className="w-4 h-4" aria-hidden="true" />
                        <span>Profile Settings</span>
                      </button>

                      <button
                        onClick={() => { setUserMenuOpen(false); openFeedback() }}
                        className="gap-2 bg-transparent w-full flex items-center justify-start space-x-2 px-2 py-1 rounded-md hover:bg-gray-900/10 dark:hover:bg-gray-900 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white -tracking-[.08em] text-left cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" aria-hidden="true" />
                        <span>Send Feedback</span>
                      </button>

                      <button
                        onClick={() => { signOut().then(() => navigate('/sign-in')); setUserMenuOpen(false) }}
                        className="gap-2 bg-transparent w-full flex items-center justify-start space-x-2 px-2 py-1 rounded-md hover:bg-gray-900/10 dark:hover:bg-gray-900 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white -tracking-[.08em] text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-400" aria-hidden="true" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Left Navigation */}
      <aside
        className={`fixed top-0 left-0 z-[99999] w-60 md:w-80 h-full rounded-r-2xl backdrop-blur-sm bg-gradient-to-r from-primary-50/25 to-primary-100/35 dark:from-black dark:to-black shadow-xl dark:shadow-black/30 transform transition-transform duration-300 ease-in-out ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
         <div className="flex items-center justify-between p-4 pt-20 border-b border-gray-200/50 dark:border-primary-500/10">
          <div>
             <h2 className="text-lg font-semibold text-gray-900 dark:text-white -tracking-[0.08em]">Quick Navigation</h2>
          </div>
          <button
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
         <nav className="flex-1 overflow-y-auto p-4">
           <div className="space-y-2">
             {navItems.map((item) => {
               const Icon = item.icon
               const active = item.href === activeHref
               return (
                 <button
                   key={item.href}
                   onClick={() => {
                     navigate(item.href)
                     setNavOpen(false)
                   }}
                  className={`group flex w-full items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    active
                      ? 'bg-gradient-to-br from-primary-100/40 via-primary-50/20 to-primary-200/30 dark:from-gray-900/50 dark:via-gray-900/30 dark:to-gray-900/20 text-primary-900 dark:text-primary-300 shadow-sm border border-primary-200/50 dark:border-primary-500/20'
                      : 'text-gray-900 dark:text-gray-200 hover:bg-gradient-to-tr hover:from-white/20 hover:to-primary-50/40 dark:hover:from-primary-900/10 dark:hover:to-primary-900/20 hover:shadow-sm'
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-all ${active ? 'font-bold' : 'group-hover:scale-110'}`} />
                  <span className={`font-medium -tracking-[0.08em] transition-all ${
                    active 
                      ? 'font-semibold' 
                      : 'group-hover:font-semibold'
                  }`}>
                     {item.label}
                   </span>
                 </button>
               )
             })}
           </div>
        </nav>
        <div className="border-t border-gray-200/50 dark:border-primary-500/10 px-4 py-4">
          <button
            onClick={() => {
              signOut().then(() => navigate('/sign-in'))
            }}
            className="group flex w-full items-center gap-3 p-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-gradient-to-tr hover:from-red-50/40 hover:to-red-100/30 dark:hover:from-red-900/10 dark:hover:to-red-900/20 hover:shadow-sm transition-all -tracking-[0.08em]"
          >
            <LogOut className="h-5 w-5 group-hover:scale-110 transition-all" />
            <span className="group-hover:font-semibold transition-all">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {navOpen && (
        <div
          className="fixed inset-0 z-[99998] bg-black/30 backdrop-blur-sm"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="relative z-10 flex-1 flex flex-col w-full pt-14">
        {/* Header */}
        <header className="bg-gradient-to-br from-blue-50/40 via-yellow-50/20 to-white/40 dark:from-black dark:via-black dark:to-black backdrop-blur-sm w-full">
          <div className="w-full px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {backHref && (
                  <button
                    onClick={() => navigate(backHref)}
                    className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-gray-900 transition-colors touch-manipulation"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white -tracking-[0.08em] truncate" style={{ fontFamily: 'Inter, sans-serif' }}>{title}</h1>
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 truncate" style={{ fontFamily: 'Inter, sans-serif' }}>{subtitle || `Welcome back, ${user?.email ?? 'User'}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {rightActions}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="w-full min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>

      {/* Feedback Modal */}
      {feedbackOpen && (
        <div
          className="fixed inset-0 z-[200000] flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeFeedback() }}
        >
          <div className="w-full max-w-md rounded-3xl shadow-2xl border border-blue-100/60 dark:border-primary-500/20 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300 bg-white dark:bg-black">
            <div className="px-5 py-4 bg-gradient-to-br from-blue-50/60 via-yellow-50/30 to-white/40 dark:from-black dark:via-black dark:to-black border-b border-blue-100/40 dark:border-primary-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-600/10 dark:bg-gray-900 border border-blue-100 dark:border-primary-500/20">
                    <MessageSquarePlus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white -tracking-[.04em]">Send Feedback</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Help us improve Blue Drum AI</p>
                  </div>
                </div>
                <button
                  onClick={closeFeedback}
                  className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-900 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {feedbackSent ? (
              <div className="p-8 text-center">
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-full bg-blue-50 dark:bg-black border border-blue-100 dark:border-primary-500/20 flex items-center justify-center">
                    <Send className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white -tracking-[.04em] mb-1">Thanks for your feedback!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Your feedback has been saved. We'll review it and get back to you soon.</p>
                <button
                  onClick={closeFeedback}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submitFeedback} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Feedback Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'bug',         label: 'Bug Report',       Icon: Bug },
                      { value: 'feature',     label: 'Feature Request',  Icon: Sparkles },
                      { value: 'improvement', label: 'Improvement',      Icon: Wrench },
                      { value: 'other',       label: 'Other',            Icon: AlertCircle },
                    ] as const).map(({ value, label, Icon }) => (
                      <label
                        key={value}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          feedbackType === value
                            ? 'border-blue-500 bg-blue-50/60 dark:bg-gray-900 shadow-sm shadow-blue-100 dark:shadow-none'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-primary-500/30 hover:bg-blue-50/30 dark:hover:bg-primary-900/10'
                        }`}
                      >
                        <input
                          type="radio"
                          name="feedbackType"
                          value={value}
                          checked={feedbackType === value}
                          onChange={() => setFeedbackType(value)}
                          className="sr-only"
                        />
                        <Icon className={`h-4 w-4 shrink-0 ${feedbackType === value ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium leading-tight ${feedbackType === value ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="feedbackTitle" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Title</label>
                    <span className={`text-xs tabular-nums ${feedbackTitle.length > 200 ? 'text-red-500 font-semibold' : feedbackTitle.length > 180 ? 'text-amber-500' : 'text-gray-400'}`}>
                      {feedbackTitle.length}/200
                    </span>
                  </div>
                  <input
                    type="text"
                    id="feedbackTitle"
                    value={feedbackTitle}
                    onChange={e => setFeedbackTitle(e.target.value.slice(0, 200))}
                    placeholder="Brief description of your feedback"
                    required
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-black ${
                      feedbackTitle.length > 0 && feedbackTitle.trim().length < 3
                        ? 'border-red-300 focus:ring-red-300 focus:border-red-400'
                        : 'border-gray-200 dark:border-gray-700 focus:ring-blue-400 focus:border-blue-400'
                    }`}
                  />
                  {feedbackTitle.length > 0 && feedbackTitle.trim().length < 3 && (
                    <p className="mt-1 text-xs text-red-500">Title must be at least 3 characters.</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="feedbackDesc" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</label>
                    <span className={`text-xs tabular-nums ${feedbackDesc.length > 5000 ? 'text-red-500 font-semibold' : feedbackDesc.length > 4800 ? 'text-amber-500' : 'text-gray-400'}`}>
                      {feedbackDesc.length}/5000
                    </span>
                  </div>
                  <textarea
                    id="feedbackDesc"
                    value={feedbackDesc}
                    onChange={e => setFeedbackDesc(e.target.value.slice(0, 5000))}
                    placeholder="Please provide detailed information…"
                    rows={4}
                    required
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors resize-none bg-white dark:bg-black ${
                      feedbackDesc.length > 0 && feedbackDesc.trim().length < 10
                        ? 'border-red-300 focus:ring-red-300 focus:border-red-400'
                        : 'border-gray-200 dark:border-gray-700 focus:ring-blue-400 focus:border-blue-400'
                    }`}
                  />
                  {feedbackDesc.length > 0 && feedbackDesc.trim().length < 10 && (
                    <p className="mt-1 text-xs text-red-500">Description must be at least 10 characters.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    feedbackSending ||
                    feedbackTitle.trim().length < 3 ||
                    feedbackDesc.trim().length < 10
                  }
                  className="w-full px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <Send className="h-4 w-4" />
                  {feedbackSending ? 'Sending…' : 'Send Feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Help Modal */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-[200000] flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setHelpOpen(false) }}
        >
          <div
            className="w-full max-w-lg rounded-3xl shadow-2xl border border-blue-100/60 dark:border-primary-500/20 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300 bg-white dark:bg-black"
          >
            <div className="px-5 py-4 bg-gradient-to-br from-blue-50/60 via-yellow-50/30 to-white/40 dark:from-black dark:via-black dark:to-black border-b border-blue-100/40 dark:border-primary-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-600/10 dark:bg-gray-900 border border-blue-100 dark:border-primary-500/20">
                    <HelpCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white -tracking-[.04em]">Help & FAQ</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Quick answers and support options</p>
                  </div>
                </div>
                <button
                  onClick={() => setHelpOpen(false)}
                  className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-900 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* FAQ items */}
              {([
                {
                  q: 'What is Blue Drum AI?',
                  a: 'Blue Drum AI is an evidence-based legal vigilance platform that helps you document, analyze, and protect yourself during sensitive legal situations such as alimony, divorce, or domestic disputes.',
                },
                {
                  q: 'How does the AI Chat Analyzer work?',
                  a: 'Upload or paste chat conversations and our AI detects emotional manipulation, red flags, and legal risks. It generates a detailed analysis you can save and export.',
                },
                {
                  q: 'Is my data private and secure?',
                  a: 'Yes. All data is stored securely in your private Supabase account with Row-Level Security — only you can access your records. No data is shared with third parties.',
                },
                {
                  q: 'What are the gender-specific modules?',
                  a: 'Certain modules are tailored by gender — e.g. Dowry Vault and DV Log are for women; Breakup Generator and Consent Vault tools are for men. You can switch modules from your Profile Settings.',
                },
                {
                  q: 'How do I generate a legal document (affidavit)?',
                  a: 'Go to Income Tracker, log at least one income entry for a month, then click "Generate Affidavit" on that entry. A signed PDF will be downloaded.',
                },
                {
                  q: 'What AI model is used?',
                  a: 'Blue Drum AI uses OpenRouter to route requests to best-in-class models. The active model is configurable by the platform administrator.',
                },
              ]).map(({ q, a }, i) => (
                <details key={i} className="group rounded-xl border border-gray-100 dark:border-primary-500/10 bg-gray-50/60 dark:bg-black overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none select-none hover:bg-blue-50/40 dark:hover:bg-gray-900 transition-colors">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 -tracking-[.03em]">{q}</span>
                    <TrendingUp className="h-3.5 w-3.5 text-gray-400 shrink-0 rotate-90 group-open:rotate-[270deg] transition-transform duration-200" />
                  </summary>
                  <div className="px-4 pb-3 pt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-primary-500/10">
                    {a}
                  </div>
                </details>
              ))}

              {/* Divider */}
              <div className="border-t border-gray-100 dark:border-primary-500/10 pt-1" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Quick links</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { label: 'Dashboard', href: '/dashboard', Icon: Home },
                    { label: 'Profile Settings', href: '/dashboard/profile', Icon: User },
                    { label: 'AI Chat Analyzer', href: '/dashboard/chat-analysis', Icon: MessageSquare },
                    { label: 'Risk Check', href: '/dashboard/risk-check', Icon: AlertTriangle },
                  ]).map(({ label, href, Icon }) => (
                    <button
                      key={href}
                      onClick={() => { navigate(href); setHelpOpen(false) }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-primary-500/20 hover:border-blue-300 dark:hover:border-primary-500/30 hover:bg-blue-50/40 dark:hover:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-700 transition-all text-left"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-blue-500" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="rounded-xl bg-gradient-to-br from-blue-50/60 via-yellow-50/20 to-white dark:from-black dark:via-black dark:to-black border border-blue-100/50 dark:border-primary-500/10 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white -tracking-[.03em]">Still need help?</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Our support team typically responds within 24 hours.</p>
                </div>
                <button
                  onClick={() => { setHelpOpen(false); openFeedback() }}
                  className="shrink-0 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                >
                  Contact us
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

