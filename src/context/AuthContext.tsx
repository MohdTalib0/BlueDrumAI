import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  user: { id: string; email?: string | null } | null
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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [loading, setLoading] = useState(true)
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      setLoading(true)
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) return
      if (error || !data.session) {
        setUser(null)
        setSessionToken(null)
      } else {
        setUser({
          id: data.session.user.id,
          email: data.session.user.email,
        })
        setSessionToken(data.session.access_token ?? null)
      }
      setLoading(false)
    }

    loadSession()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email,
        })
        setSessionToken(session.access_token ?? null)
      } else {
        setUser(null)
        setSessionToken(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription?.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      sessionToken,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          const emailNotConfirmed =
            error.code === 'email_not_confirmed' ||
            error.message?.toLowerCase().includes('confirm') ||
            error.message?.toLowerCase().includes('verify')
          return { error: error.message, emailNotConfirmed }
        }
        return {}
      },
      async signUp(email, password, firstName, lastName) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        })
        if (error) return { error: error.message }
        // If email confirmation is required, session will be null
        const emailConfirmationRequired = !data.session
        return { emailConfirmationRequired }
      },
      async signOut() {
        await supabase.auth.signOut()
      },
      async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/forgot-password`,
        })
        if (error) return { error: error.message }
        return {}
      },
      async resendEmailVerification(email: string) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
        })
        if (error) return { error: error.message }
        return { sent: true }
      },
    }),
    [user, loading, sessionToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

