import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Retorna true quando as variáveis de ambiente do Supabase estão definidas.
 * Quando false, toda funcionalidade online é desativada silenciosamente.
 */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  return Boolean(url && url.trim().length > 0 && key && key.trim().length > 0)
}

let _client: SupabaseClient | null = null

/**
 * Retorna o cliente Supabase (singleton lazy) ou null quando não configurado.
 * Nunca lança erro na inicialização do app.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (_client) return _client

  const url = import.meta.env.VITE_SUPABASE_URL as string
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  _client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return _client
}
