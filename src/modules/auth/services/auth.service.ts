import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { getSupabaseClient, isSupabaseConfigured } from '../../../shared/services/supabase.client'
import { readViteEnv } from '../../../shared/services/vite-env'
import { i18n } from '@/shared/i18n'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CLAIM_QUERY_KEYS = ['session', 'game', 'token'] as const

export interface AuthResult {
  user: User | null
  error: string | null
}

/**
 * Retorna a URL de redirecionamento para e-mails de autenticação.
 * Em um convite válido, preserva somente a rota /claim e um token UUID
 * conhecido. Qualquer outra rota volta para a raiz pública do app; assim o
 * callback nunca vira um open redirect nem carrega parâmetros arbitrários.
 * Retorna undefined em ambientes sem window (SSR/testes sem jsdom).
 */
function getEmailRedirectTo(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const base = readViteEnv('BASE_URL') ?? '/'
  const baseUrl = new URL(base, window.location.origin)
  const currentUrl = new URL(window.location.href)
  const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`
  const claimPath = `${basePath}claim`.replace(/\/{2,}/g, '/')

  if (currentUrl.origin === baseUrl.origin && currentUrl.pathname === claimPath) {
    for (const key of CLAIM_QUERY_KEYS) {
      const value = currentUrl.searchParams.get(key)
      if (value && UUID_RE.test(value)) {
        const redirect = new URL(claimPath, baseUrl.origin)
        redirect.searchParams.set(key, value)
        return redirect.toString()
      }
    }
  }

  return baseUrl.toString()
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

  if (error) return { error: i18n.t('auth:services.auth.resendFailed') }
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
    return { user: null, error: i18n.t('auth:services.auth.invalidCredentials') }
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
 * Re-autentica o usuário atual com a senha fornecida.
 * Usa signInWithPassword com o e-mail da sessão ativa para confirmar identidade antes de
 * ações destrutivas (ex.: delete de partida).
 * Retorna false (no-op) quando Supabase não está configurado ou não há sessão.
 * Nunca lança exceção.
 */
export async function verifyPassword(password: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const client = getSupabaseClient()!
  try {
    const { data: { session: authSession } } = await client.auth.getSession()
    if (!authSession?.user?.email) return false

    const { error } = await client.auth.signInWithPassword({
      email: authSession.user.email,
      password,
    })

    return error == null
  } catch {
    return false
  }
}

/**
 * Envia o e-mail de redefinição de senha. O link redireciona para o app
 * (mesma URL dos e-mails de confirmação); ao abrir, o supabase-js dispara o
 * evento PASSWORD_RECOVERY e o PasswordRecoveryModal assume.
 * No-op quando Supabase não está configurado. Mensagem de erro genérica em
 * pt-BR para não vazar se o e-mail existe ou não.
 */
export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }

  const client = getSupabaseClient()!
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: getEmailRedirectTo(),
  })

  if (error) {
    // O motivo real fica no console para diagnóstico; a UI recebe mensagem
    // genérica (não vaza detalhes), exceto rate limit — esse o usuário
    // resolve sozinho esperando, então merece mensagem própria.
    console.warn('[auth] resetPasswordForEmail falhou:', error)
    const message = error.message?.toLowerCase() ?? ''
    if (error.status === 429 || message.includes('rate limit') || message.includes('security purposes')) {
      return { error: i18n.t('auth:services.auth.resetRateLimit') }
    }
    return { error: i18n.t('auth:services.auth.resetFailed') }
  }
  return { error: null }
}

/**
 * Define uma nova senha para o usuário da sessão atual (inclusive a sessão
 * temporária criada pelo link de recuperação). No-op quando não configurado.
 */
export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }

  const client = getSupabaseClient()!
  const { error } = await client.auth.updateUser({ password: newPassword })

  if (error) {
    return { error: i18n.t('auth:services.auth.updatePasswordFailed') }
  }
  return { error: null }
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
