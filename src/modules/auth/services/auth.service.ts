import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { getSupabaseClient, isSupabaseConfigured } from '../../../shared/services/supabase.client'

export interface AuthResult {
  user: User | null
  error: string | null
}

/**
 * Registra um novo usuário com email, senha e nome de exibição.
 * Retorna no-op (user: null, error: null) quando Supabase não está configurado.
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { user: null, error: null }

  const client = getSupabaseClient()!
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })

  if (error) return { user: null, error: error.message }
  return { user: data.user, error: null }
}

/**
 * Autentica com email e senha.
 * Mensagem de erro genérica para não revelar se o email existe.
 * Retorna no-op quando Supabase não está configurado.
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { user: null, error: null }

  const client = getSupabaseClient()!
  const { data, error } = await client.auth.signInWithPassword({ email, password })

  if (error) {
    // Mensagem genérica: não revela se o email existe ou não
    return { user: null, error: 'Email ou senha inválidos. Tente novamente.' }
  }
  return { user: data.user, error: null }
}

/**
 * Encerra a sessão do usuário atual.
 * No-op quando Supabase não está configurado.
 */
export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return
  await getSupabaseClient()!.auth.signOut()
}

/**
 * Retorna a sessão atual ou null.
 * No-op quando Supabase não está configurado.
 */
export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null
  const { data } = await getSupabaseClient()!.auth.getSession()
  return data.session
}

/**
 * Assina mudanças de estado de autenticação.
 * Retorna uma função de cancelamento. No-op quando Supabase não está configurado.
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  if (!isSupabaseConfigured()) return () => undefined

  const { data } = getSupabaseClient()!.auth.onAuthStateChange(callback)
  return () => data.subscription.unsubscribe()
}
