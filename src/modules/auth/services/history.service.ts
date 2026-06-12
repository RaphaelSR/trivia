import { getSupabaseClient, isSupabaseConfigured } from '../../../shared/services/supabase.client'

export interface GameSummary {
  /** Placar final por time: { [teamName]: score } */
  scores: Record<string, number>
  /** Nome do time vencedor (ou null se empate/não definido) */
  winner: string | null
  /** Metadados extras (times, participantes etc.) — estrutura livre */
  [key: string]: unknown
}

export interface GameHistoryEntry {
  id: string
  user_id: string
  title: string
  finished_at: string
  summary: GameSummary
  created_at: string
}

/**
 * Salva uma partida finalizada no histórico do usuário logado.
 * No-op silencioso se:
 *  - Supabase não está configurado
 *  - Não há sessão ativa (usuário deslogado)
 */
export async function saveGameToHistory(
  title: string,
  summary: GameSummary,
): Promise<GameHistoryEntry | null> {
  if (!isSupabaseConfigured()) return null

  const client = getSupabaseClient()!
  const {
    data: { session },
  } = await client.auth.getSession()

  if (!session?.user) return null

  const { data, error } = await client
    .from('game_history')
    .insert({
      user_id: session.user.id,
      title,
      summary,
      finished_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return null
  return data as GameHistoryEntry
}

/**
 * Retorna os últimos 20 jogos do usuário logado em ordem cronológica inversa.
 * Retorna array vazio se não configurado ou sem sessão.
 */
export async function listGameHistory(): Promise<GameHistoryEntry[]> {
  if (!isSupabaseConfigured()) return []

  const client = getSupabaseClient()!
  const {
    data: { session },
  } = await client.auth.getSession()

  if (!session?.user) return []

  const { data, error } = await client
    .from('game_history')
    .select('*')
    .eq('user_id', session.user.id)
    .order('finished_at', { ascending: false })
    .limit(20)

  if (error) return []
  return (data ?? []) as GameHistoryEntry[]
}
