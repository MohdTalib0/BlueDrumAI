import { ReactNode, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Upload, LogOut, Clock4, Menu, X, TrendingUp, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface Props {
  children: ReactNode
  title?: string
  subtitle?: string
  rightActions?: ReactNode
}

export function DashboardLayout({ children, title = 'Dashboard', subtitle, rightActions }: Props) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  const navItems = useMemo(
    () => [
      { label: 'Dashboard', icon: Home, href: '/dashboard' },
      { label: 'Vault Timeline', icon: Clock4, href: '/dashboard/vault/timeline' },
      { label: 'Upload Evidence', icon: Upload, href: '/dashboard/vault/upload' },
      { label: 'Income Tracker', icon: TrendingUp, href: '/dashboard/income-tracker' },
      { label: 'Red Flag Radar', icon: AlertTriangle, href: '/dashboard/red-flag-radar' },
    ],
    []
  )

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-yellow-50/30 to-white flex font-sans relative overflow-hidden">
      {/* Decorative gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 via-transparent to-yellow-100/20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-200/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Top brand bar (also for private pages) */}
      <div className="fixed inset-x-0 top-0 z-50 border-b border-blue-100/50 backdrop-blur-sm bg-gradient-to-br from-blue-50/40 via-yellow-50/20 to-white/40">
        <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center">
                <img src="/logo.svg" alt="Blue Drum AI" className="h-10 w-10" />
              </div>
              <div className="leading-tight">
                <div className="text-base font-bold text-gray-900">Blue Drum AI</div>
                <div className="text-xs text-gray-500">Evidence-based legal vigilance</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="hidden md:inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                signOut().then(() => navigate('/sign-in'))
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Left Navigation */}
      <aside
        className={`fixed top-0 left-0 z-[99999] w-60 md:w-80 h-full rounded-r-2xl backdrop-blur-sm bg-gradient-to-r from-primary-50/25 to-primary-100/35 shadow-xl transform transition-transform duration-300 ease-in-out ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
         <div className="flex items-center justify-between p-4 pt-20 border-b border-gray-200/50">
          <div>
             <h2 className="text-lg font-semibold text-gray-900 -tracking-[0.08em]">Quick Navigation</h2>
          </div>
          <button
            className="p-2 text-gray-600 hover:text-gray-900 cursor-pointer rounded-lg hover:bg-gray-100 transition-colors"
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
               const active = location.pathname.startsWith(item.href)
               return (
                 <button
                   key={item.href}
                   onClick={() => {
                     navigate(item.href)
                     setNavOpen(false)
                   }}
                   className={`group flex w-full items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                     active
                       ? 'bg-gradient-to-br from-primary-100/40 via-primary-50/20 to-primary-200/30 text-primary-900 shadow-sm border border-primary-200/50'
                       : 'text-gray-700 hover:bg-gradient-to-tr hover:from-white/20 hover:to-primary-50/40 hover:shadow-sm'
                   }`}
                 >
                   <Icon className={`h-5 w-5 transition-all ${active ? 'font-bold' : 'group-hover:scale-110'}`} />
                   <span className={`font-medium -tracking-[0.08em] transition-all ${
                     active 
                       ? 'font-semibold text-gray-900' 
                       : 'group-hover:text-gray-900 group-hover:font-semibold'
                   }`}>
                     {item.label}
                   </span>
                 </button>
               )
             })}
           </div>
        </nav>
        <div className="border-t border-gray-200/50 px-4 py-4">
          <button
            onClick={() => {
              signOut().then(() => navigate('/sign-in'))
            }}
            className="group flex w-full items-center gap-3 p-3 rounded-xl text-sm font-medium text-red-600 hover:bg-gradient-to-tr hover:from-red-50/40 hover:to-red-100/30 hover:shadow-sm transition-all -tracking-[0.08em]"
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
        <header className="bg-gradient-to-br from-blue-50/40 via-yellow-50/20 to-white/40 backdrop-blur-sm w-full">
          <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900 -tracking-[0.08em]" style={{ fontFamily: 'Inter, sans-serif' }}>{title}</h1>
                    <p className="text-base text-gray-500 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{subtitle || `Welcome back, ${user?.email ?? ''}`}</p>
                  </div>
                </div>
              <div className="flex items-center gap-3">
                {rightActions}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="w-full px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

