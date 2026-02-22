import { ReactNode, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, MessageSquare, Activity, LogOut, Menu, X, Shield, Moon, Sun, ArrowLeft, BarChart3, CreditCard, Globe } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDarkMode } from '../hooks/useDarkMode'

interface Props {
  children: ReactNode
  title?: string
  subtitle?: string
}

const navItems = [
  { label: 'Overview', icon: Home, href: '/admin' },
  { label: 'Users', icon: Users, href: '/admin/users' },
  { label: 'Feature Usage', icon: BarChart3, href: '/admin/feature-usage' },
  { label: 'Feedback', icon: MessageSquare, href: '/admin/feedback' },
  { label: 'AI Usage', icon: Activity, href: '/admin/ai-usage' },
  { label: 'Subscriptions', icon: CreditCard, href: '/admin/subscriptions' },
  { label: 'Geo & Sessions', icon: Globe, href: '/admin/geo' },
]

export function AdminLayout({ children, title = 'Admin', subtitle }: Props) {
  const { user, signOut } = useAuth()
  const { dark, toggle: toggleDark } = useDarkMode()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    : user?.email?.split('@')[0] || 'Admin'

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-black transition-colors duration-300">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">Super Admin</div>
              <div className="text-[10px] text-gray-400">Blue Drum AI</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon
              const active = item.href === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.href)
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Bottom */}
          <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-4 space-y-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </button>
            <button
              onClick={() => signOut().then(() => navigate('/sign-in'))}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-[99999] w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 lg:hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">Super Admin</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="px-3 py-4 space-y-1">
              {navItems.map(item => {
                const Icon = item.icon
                const active = item.href === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname.startsWith(item.href)
                return (
                  <button
                    key={item.href}
                    onClick={() => { navigate(item.href); setSidebarOpen(false) }}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
            <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-4">
              <button
                onClick={() => { navigate('/dashboard'); setSidebarOpen(false) }}
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to App
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
                {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDark}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                <div className="h-7 w-7 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">
                  {displayName[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{displayName}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
