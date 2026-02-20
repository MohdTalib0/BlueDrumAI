import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getEdgeFunctionUrl } from '../lib/api'

export type UserGender = 'male' | 'female' | 'both' | null

interface UserProfile {
  id: string
  email?: string | null
  gender?: UserGender
  first_name?: string | null
  last_name?: string | null
}

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [loading, setLoading] = useState(true)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const profileFetchedRef = useRef(false)

  const fetchProfile = useCallback(async (token: string, userId: string, email?: string | null) => {
    try {
      const res = await fetch(`${getEdgeFunctionUrl('auth')}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.ok && data.user) {
          setUser({
            id: userId,
            email: data.user.email ?? email,
            gender: data.user.gender ?? null,
            first_name: data.user.first_name ?? null,
            last_name: data.user.last_name ?? null,
          })
          return
        }
      }
    } catch {
      // Profile fetch failed — fall back to basic auth data
    }
    setUser({ id: userId, email, gender: null })
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      setLoading(true)
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) return
      if (error || !data.session) {
        setUser(null)
        setSessionToken(null)
        setLoading(false)
      } else {
        setSessionToken(data.session.access_token ?? null)
        await fetchProfile(data.session.access_token, data.session.user.id, data.session.user.email)
        profileFetchedRef.current = true
        if (mounted) setLoading(false)
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
        profileFetchedRef.current = false
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

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const emailNotConfirmed =
        error.code === 'email_not_confirmed' ||
        error.message?.toLowerCase().includes('confirm') ||
        error.message?.toLowerCase().includes('verify')
      return { error: error.message, emailNotConfirmed }
    }
    return {}
  }, [])

  const signUp = useCallback(async (email: string, password: string, firstName?: string, lastName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    })
    if (error) return { error: error.message }
    const emailConfirmationRequired = !data.session
    return { emailConfirmationRequired }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/forgot-password`,
    })
    if (error) return { error: error.message }
    return {}
  }, [])

  const resendEmailVerification = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) return { error: error.message }
    return { sent: true }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, sessionToken, signIn, signUp, signOut, resetPassword, resendEmailVerification, refreshProfile }),
    [user, loading, sessionToken, signIn, signUp, signOut, resetPassword, resendEmailVerification, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
