import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readViteEnv } from './vite-env'

/**
 * Retorna true quando as variáveis de ambiente do Supabase estão definidas.
 * Quando false, toda funcionalidade online é desativada silenciosamente.
 */
export function isSupabaseConfigured(): boolean {
  const url = readViteEnv('VITE_SUPABASE_URL')
  const key = readViteEnv('VITE_SUPABASE_ANON_KEY')
  return Boolean(url && url.trim().length > 0 && key && key.trim().length > 0)
}

let _client: SupabaseClient | null = null

let _cachedAccessToken: string | null = null
let _cachedUserId: string | null = null

/**
 * Retorna o cliente Supabase (singleton lazy) ou null quando não configurado.
 * Nunca lança erro na inicialização do app.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (_client) return _client

  const url = readViteEnv('VITE_SUPABASE_URL') as string
  const key = readViteEnv('VITE_SUPABASE_ANON_KEY') as string

  _client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  _client.auth.onAuthStateChange((_event, session) => {
    _cachedAccessToken = session?.access_token ?? null
    _cachedUserId = session?.user?.id ?? null
  })

  return _client
}

/**
 * Snapshot síncrono da autenticação atual, mantido via onAuthStateChange.
 * Handlers de unload (pagehide/beforeunload) não podem esperar o
 * client.auth.getSession() assíncrono — a página morre antes do await
 * resolver — então leem daqui.
 */
export function getCachedAuth(): { accessToken: string; userId: string } | null {
  if (!_cachedAccessToken || !_cachedUserId) return null
  return { accessToken: _cachedAccessToken, userId: _cachedUserId }
}

/**
 * URL base do REST (PostgREST) + anon key, para requests diretos fora do
 * supabase-js (ex.: fetch keepalive em unload). Null quando não configurado.
 */
export function getSupabaseRestConfig(): { restUrl: string; anonKey: string } | null {
  if (!isSupabaseConfigured()) return null
  const url = (readViteEnv('VITE_SUPABASE_URL') as string).replace(/\/+$/, '')
  const anonKey = readViteEnv('VITE_SUPABASE_ANON_KEY') as string
  return { restUrl: `${url}/rest/v1`, anonKey }
}
