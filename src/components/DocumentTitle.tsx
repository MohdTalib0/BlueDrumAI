import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const BASE_TITLE = 'Blue Drum AI'

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Organize Evidence, AI Chat Analysis, Lawyer-Ready Case Files | Blue Drum AI',
  '/sign-in': 'Sign In | Blue Drum AI',
  '/sign-up': 'Sign Up Free | Blue Drum AI',
  '/forgot-password': 'Reset Password | Blue Drum AI',
  '/verify-email': 'Verify Email | Blue Drum AI',
  '/onboarding': 'Get Started | Blue Drum AI',
  '/dashboard': 'Dashboard | Blue Drum AI',
  '/dashboard/vault': 'Evidence Vault | Blue Drum AI',
  '/dashboard/vault/upload': 'Upload Evidence | Blue Drum AI',
  '/dashboard/vault/timeline': 'Evidence Timeline | Blue Drum AI',
  '/dashboard/red-flag-radar': 'Red Flag Radar - AI Chat Analysis | Blue Drum AI',
  '/dashboard/red-flag-radar/history': 'Analysis History | Blue Drum AI',
  '/dashboard/red-flag-radar/compare': 'Compare Analyses | Blue Drum AI',
  '/dashboard/income-tracker': 'Income Tracker | Blue Drum AI',
  '/dashboard/income-tracker/history': 'Income History | Blue Drum AI',
  '/dashboard/income-tracker/affidavit': 'Affidavit Generator | Blue Drum AI',
  '/dashboard/breakup-generator': 'Breakup Generator | Blue Drum AI',
  '/dashboard/dowry-vault': 'Dowry Vault | Blue Drum AI',
  '/dashboard/dv-log': 'DV Log | Blue Drum AI',
  '/dashboard/maintenance': 'Maintenance Calculator | Blue Drum AI',
  '/dashboard/profile': 'Profile | Blue Drum AI',
  '/dashboard/subscription': 'Subscription | Blue Drum AI',
  '/admin': 'Admin | Blue Drum AI',
}

function getTitle(pathname: string): string {
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  // Prefix match for nested routes
  const segments = pathname.split('/').filter(Boolean)
  for (let i = segments.length; i >= 1; i--) {
    const path = '/' + segments.slice(0, i).join('/')
    if (ROUTE_TITLES[path]) return ROUTE_TITLES[path]
  }
  return BASE_TITLE
}

export function DocumentTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = getTitle(pathname)
  }, [pathname])

  return null
}
