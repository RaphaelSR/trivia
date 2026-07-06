/**
 * session-snapshot.service
 *
 * Histórico de versões (T4). Grava snapshots periódicos da partida online via a
 * RPC `save_session_snapshot` (que poda mantendo os últimos N) e lista para
 * restauração. Tudo owner-only por RLS. Falhas são silenciosas (nunca quebram
 * o jogo) — snapshot é uma rede de segurança, não um caminho crítico.
 */

import { getSupabaseClient, isSupabaseConfigured } from '../../../shared/services/supabase.client'
import type { TriviaSession } from '../../trivia/types'

export interface SessionSnapshot {
  id: string
  createdAt: string
  title: string
  session: TriviaSession
}

async function authedClient() {
  if (!isSupabaseConfigured()) return null
  const client = getSupabaseClient()
  if (!client) return null
  const {
    data: { session: authSession },
  } = await client.auth.getSession()
  if (!authSession?.user) return null
  return client
}

/**
 * Resultado de saveSessionSnapshot:
 * - 'saved'   : snapshot gravado na nuvem.
 * - 'skipped' : no-op legítimo (sem Supabase / deslogado) — não é falha.
 * - 'failed'  : tentou e não conseguiu (rede, RLS, RPC) — quem chama pode
 *               contar falhas consecutivas e avisar o usuário.
 */
export type SnapshotResult = 'saved' | 'skipped' | 'failed'

/**
 * Grava um snapshot da sessão (a RPC poda mantendo os últimos N). Nunca lança.
 *
 * Atenção: o supabase-js NÃO rejeita em erro de RPC — devolve `{ error }` no
 * resultado; o catch só cobre falhas de rede. Os dois caminhos viram 'failed'.
 */
export async function saveSessionSnapshot(
  clientSessionId: string,
  title: string,
  session: TriviaSession,
): Promise<SnapshotResult> {
  const client = await authedClient()
  if (!client) return 'skipped'
  try {
    const { error } = await client.rpc('save_session_snapshot', {
      p_client_session_id: clientSessionId,
      p_title: title,
      p_session: session,
    })
    if (error) {
      console.warn('[session-snapshot] falha ao gravar snapshot (ignorado):', error)
      return 'failed'
    }
    return 'saved'
  } catch (err) {
    console.warn('[session-snapshot] falha ao gravar snapshot (ignorado):', err)
    return 'failed'
  }
}

/**
 * Lista os snapshots de uma partida (mais recentes primeiro). Retorna [] quando
 * não configurado / deslogado / sem snapshots. Nunca lança.
 */
export async function listSessionSnapshots(clientSessionId: string): Promise<SessionSnapshot[]> {
  const client = await authedClient()
  if (!client) return []
  try {
    const { data, error } = await client
      .from('online_session_snapshots')
      .select('id, created_at, title, session')
      .eq('client_session_id', clientSessionId)
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return (data as Array<{ id: string; created_at: string; title: string; session: TriviaSession }>).map(
      (row) => ({ id: row.id, createdAt: row.created_at, title: row.title, session: row.session }),
    )
  } catch (err) {
    console.warn('[session-snapshot] falha ao listar snapshots (ignorado):', err)
    return []
  }
}
