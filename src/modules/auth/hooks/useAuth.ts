import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '../../../shared/services/supabase.client'
import { getSession, onAuthStateChange, resendConfirmation, signIn, signOut, signUp } from '../services/auth.service'
import { claimParticipation, linkMyParticipations } from '../services/normalized-history.service'

export interface AuthState {
  user: User | null
  loading: boolean
  /** true apenas quando VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configuradas */
  configured: boolean
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<string | null>
  register: (email: string, password: string, displayName: string) => Promise<string | null>
  logout: () => Promise<void>
  resend: (email: string) => Promise<string | null>
  /** Reivindica uma participação por token de claim. Retorna gameId ou erro. */
  claim: (token: string) => Promise<{ gameId: string | null; error: string | null }>
}

export function useAuth(): AuthState & AuthActions {
  const configured = isSupabaseConfigured()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(configured)

  useEffect(() => {
    if (!configured) return

    let cancelled = false

    // Carrega a sessão existente
    void getSession().then((session) => {
      if (!cancelled) {
        setUser(session?.user ?? null)
        setLoading(false)
        // fire-and-forget: auto-vincula participações pelo e-mail no carregamento inicial
        if (session?.user) {
          void linkMyParticipations().catch(() => undefined)
        }
      }
    })

    // Assina mudanças em tempo real
    const unsubscribe = onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setUser(session?.user ?? null)
        setLoading(false)
        // fire-and-forget: auto-vincula quando o estado de auth muda (login, confirmação, etc.)
        if (session?.user) {
          void linkMyParticipations().catch(() => undefined)
        }
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [configured])

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    setLoading(true)
    const result = await signIn(email, password)
    setLoading(false)
    return result.error
  }, [])

  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<string | null> => {
      setLoading(true)
      const result = await signUp(email, password, displayName)
      setLoading(false)
      return result.error
    },
    [],
  )

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true)
    await signOut()
    setUser(null)
    setLoading(false)
  }, [])

  const resend = useCallback(async (email: string): Promise<string | null> => {
    const result = await resendConfirmation(email)
    return result.error
  }, [])

  const claim = useCallback(
    async (token: string): Promise<{ gameId: string | null; error: string | null }> => {
      return claimParticipation(token)
    },
    [],
  )

  return { user, loading, configured, login, register, logout, resend, claim }
}
