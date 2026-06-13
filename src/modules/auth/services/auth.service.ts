import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { getSupabaseClient, isSupabaseConfigured } from '../../../shared/services/supabase.client'
import { readViteEnv } from '../../../shared/services/vite-env'

export interface AuthResult {
  user: User | null
  error: string | null
}

/**
 * Retorna a URL de redirecionamento para o email de confirmação.
 * Usa window.location.origin + BASE_URL do Vite (lido via readViteEnv para compatibilidade com Jest).
 * Retorna undefined em ambientes sem window (SSR/testes sem jsdom).
 */
function getEmailRedirectTo(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const base = readViteEnv('BASE_URL') ?? '/'
  return window.location.origin + base
}

/** Idioma do usuário no cadastro (preparação para i18n de e-mails). */
function getLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language
  }
  return 'pt-BR'
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
    options: {
      // locale fica no user_metadata para internacionalização futura dos
      // e-mails (Send Email Hook lê este campo); template atual é só pt-BR.
      data: { display_name: displayName, locale: getLocale() },
      emailRedirectTo: getEmailRedirectTo(),
    },
  })

  if (error) return { user: null, error: error.message }
  return { user: data.user, error: null }
}

/**
 * Reenvia o e-mail de confirmação de cadastro para o endereço informado.
 * Retorna no-op quando Supabase não está configurado.
 * Erros são retornados com mensagem genérica em pt-BR para não vazar detalhes.
 */
export async function resendConfirmation(email: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }

  const client = getSupabaseClient()!
  const { error } = await client.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: getEmailRedirectTo() },
  })

  if (error) return { error: 'Não foi possível reenviar. Tente novamente em instantes.' }
  return { error: null }
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
