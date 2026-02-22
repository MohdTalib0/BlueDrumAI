import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getEdgeFunctionUrl } from '../lib/api'

export type UserGender = 'male' | 'female' | 'both' | null

export type UserRole = 'user' | 'admin' | 'super_admin'

interface UserProfile {
  id: string
  email?: string | null
  gender?: UserGender
  first_name?: string | null
  last_name?: string | null
  onboarding_completed?: boolean
  role?: UserRole
}

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  profileReady: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string; emailNotConfirmed?: boolean }>
  signUp: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ) => Promise<{ error?: string; emailConfirmationRequired?: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: string }>
  resendEmailVerification: (email: string) => Promise<{ error?: string; sent?: boolean }>
  sessionToken: string | null
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search)
    const utm_source = params.get('utm_source')
    const utm_medium = params.get('utm_medium')
    const utm_campaign = params.get('utm_campaign')
    const referrer = document.referrer || null

    if (utm_source || utm_medium || utm_campaign || referrer) {
      const stored = sessionStorage.getItem('attribution')
      if (!stored) {
        sessionStorage.setItem('attribution', JSON.stringify({
          utm_source, utm_medium, utm_campaign, referrer,
          source: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile_web' : 'web',
        }))
      }
    } else if (!sessionStorage.getItem('attribution')) {
      sessionStorage.setItem('attribution', JSON.stringify({
        source: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile_web' : 'web',
      }))
    }
  } catch { /* sessionStorage unavailable */ }
}

function getAttribution(): Record<string, string | null> | null {
  try {
    const raw = sessionStorage.getItem('attribution')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

captureAttribution()

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [loading, setLoading] = useState(true)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [profileReady, setProfileReady] = useState(false)
  const profileFetchedRef = useRef(false)

  const clearAuth = useCallback(() => {
    setUser(null)
    setSessionToken(null)
    setProfileReady(true)
    setLoading(false)
    profileFetchedRef.current = true
  }, [])

  const fetchProfile = useCallback(async (token: string, userId: string, email?: string | null) => {
    let res: Response | undefined
    try {
      res = await fetch(`${getEdgeFunctionUrl('auth')}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Network error — fall back to basic auth data so user isn't stuck
      setUser({ id: userId, email, gender: null, onboarding_completed: false })
      setProfileReady(true)
      return
    }

    if (res.ok) {
      const data = await res.json()
      if (data.ok && data.user) {
        setUser({
          id: userId,
          email: data.user.email ?? email,
          gender: data.user.gender ?? null,
          first_name: data.user.first_name ?? null,
          last_name: data.user.last_name ?? null,
          onboarding_completed: data.user.onboarding_completed ?? false,
          role: data.user.role ?? 'user',
        })
        setProfileReady(true)
        return
      }
    }

    // 401 or any non-ok response — clear everything first, THEN sign out
    // (clearing first prevents onAuthStateChange from resetting state)
    clearAuth()
    supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  }, [clearAuth])

  useEffect(() => {
    function handleSessionExpired() {
      clearAuth()
      supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    }
    window.addEventListener('auth:session-expired', handleSessionExpired)
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired)
  }, [clearAuth])

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      setLoading(true)
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) return
      if (error || !data.session) {
        setUser(null)
        setSessionToken(null)
        setProfileReady(true)
        setLoading(false)
      } else {
        const { access_token, user: sessionUser } = data.session
        setSessionToken(access_token ?? null)
        if (!profileFetchedRef.current) {
          setUser({ id: sessionUser.id, email: sessionUser.email, gender: null })
        }
        setLoading(false)
        // Don't call fetchProfile here — onAuthStateChange INITIAL_SESSION handles it.
        // Calling from both creates a race: clearAuth→signOut→onAuthStateChange(null)
        // resets profileFetchedRef, then loadSession re-creates user without profile.
      }
    }

    loadSession()

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (session) {
        setSessionToken(session.access_token ?? null)
        if (!profileFetchedRef.current) {
          await fetchProfile(session.access_token, session.user.id, session.user.email)
          profileFetchedRef.current = true
        } else {
          setUser(prev => prev?.id === session.user.id ? prev : {
            id: session.user.id,
            email: session.user.email,
            gender: null,
          })
        }
      } else {
        setUser(null)
        setSessionToken(null)
        setProfileReady(true)
        // Don't reset profileFetchedRef here — signOut triggered by clearAuth
        // would reset it, causing loadSession to re-create user without profile.
        // It's reset in signIn/signUp instead (when a new session starts).
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription?.subscription.unsubscribe()
    }
  }, [fetchProfile])

  const refreshProfile = useCallback(async () => {
    if (!sessionToken || !user?.id) return
    await fetchProfile(sessionToken, user.id, user.email)
  }, [sessionToken, user?.id, user?.email, fetchProfile])

  const recordSession = useCallback(async (token: string) => {
    try {
      const attribution = getAttribution()
      await fetch(`${getEdgeFunctionUrl('auth')}/session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ attribution }),
      })
    } catch {
      // Non-critical — login tracking failure should not block user
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    profileFetchedRef.current = false // Reset so onAuthStateChange fetches profile for new session
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const emailNotConfirmed =
        error.code === 'email_not_confirmed' ||
        error.message?.toLowerCase().includes('confirm') ||
        error.message?.toLowerCase().includes('verify')
      return { error: error.message, emailNotConfirmed }
    }
    if (data.session?.access_token) {
      recordSession(data.session.access_token)
    }
    return {}
  }, [recordSession])

  const signUp = useCallback(async (email: string, password: string, firstName?: string, lastName?: string) => {
    profileFetchedRef.current = false // Reset so onAuthStateChange fetches profile for new session
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    })
    if (error) return { error: error.message }
    const emailConfirmationRequired = !data.session
    if (data.session?.access_token) {
      recordSession(data.session.access_token)
    }
    return { emailConfirmationRequired }
  }, [recordSession])

  const signOut = useCallback(async () => {
    clearAuth()
    try {
      const { error } = await supabase.auth.signOut()
      if (error) await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    } catch {
      supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    }
  }, [clearAuth])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/forgot-password`,
    })
    if (error) return { error: error.message }
    return {}
  }, [])

  const resendEmailVerification = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/verify-email` },
    })
    if (error) return { error: error.message }
    return { sent: true }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, profileReady, sessionToken, signIn, signUp, signOut, resetPassword, resendEmailVerification, refreshProfile }),
    [user, loading, profileReady, sessionToken, signIn, signUp, signOut, resetPassword, resendEmailVerification, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
