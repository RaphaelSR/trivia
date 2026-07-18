/**
 * Flush de emergência para handlers de saída da página
 * (pagehide / beforeunload / visibilitychange=hidden).
 *
 * O caminho normal de flush (supabase-js) faz `await` do auth antes do fetch;
 * quando a aba está fechando, a página morre antes do await resolver e o
 * progresso pendente se perde — em aba anônima, junto com o localStorage.
 * `fetch` com `keepalive: true` é a única forma de um request sobreviver ao
 * unload, desde que seja disparado de forma síncrona: aqui o token vem do
 * cache de auth (getCachedAuth) e a RPC vai direto ao REST do PostgREST.
 *
 * Best-effort por design: não dá para confirmar sucesso nem limpar o estado
 * pendente. Se a página continuar viva (ex.: beforeunload cancelado), o
 * caminho assíncrono re-envia o mesmo snapshot — a RPC localiza a sessão pelo
 * mesmo ID, tornando o request duplicado idempotente.
 */

import { getCachedAuth, getSupabaseRestConfig } from '../../../shared/services/supabase.client'
import type { TriviaSession } from '../../trivia/types'

/**
 * Orçamento de keepalive por página é 64 KiB (spec do fetch); margem para
 * headers e para a inflação UTF-8 de texto acentuado.
 */
const KEEPALIVE_BODY_LIMIT = 60_000

export interface KeepaliveSnapshot {
  title: string
  mode: string
  session: TriviaSession
}

/**
 * Dispara a RPC transacional com keepalive. Ela arquiva uma partida ativa
 * diferente antes de ativar a identidade enviada, exatamente como o flush
 * normal. Retorna true se o request foi disparado (não confirma que chegou).
 */
export function sendKeepaliveSessionPatch(snapshot: KeepaliveSnapshot): boolean {
  const rest = getSupabaseRestConfig()
  const auth = getCachedAuth()
  if (!rest || !auth) return false
  if (typeof fetch !== 'function') return false

  let body: string
  try {
    body = JSON.stringify({
      p_title: snapshot.title,
      p_mode: snapshot.mode,
      p_session: snapshot.session,
    })
  } catch {
    return false
  }
  if (body.length > KEEPALIVE_BODY_LIMIT) return false

  try {
    void fetch(
      `${rest.restUrl}/rpc/save_online_session_snapshot`,
      {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          apikey: rest.anonKey,
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body,
      },
    ).catch(() => {
      // Sem retry aqui: a página está morrendo; o estado pendente fica para o
      // caminho assíncrono caso ela sobreviva.
    })
    return true
  } catch {
    return false
  }
}
