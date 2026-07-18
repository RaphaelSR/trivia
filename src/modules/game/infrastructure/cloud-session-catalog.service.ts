import { getSupabaseClient, isSupabaseConfigured } from '../../../shared/services/supabase.client'
import type { TriviaSession } from '../../trivia/types'

const CATALOG_TIMEOUT_MS = 15_000
const CATALOG_LIMIT = 50

export type CloudSessionRecord = {
  rowId: string
  status: 'active' | 'archived'
  title: string
  mode: string
  createdAt: string
  updatedAt: string
  session: TriviaSession
}

export type CloudSessionCatalogResult = {
  records: CloudSessionRecord[]
  error: 'unavailable' | null
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('cloud-session-catalog-timeout')), timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

/**
 * Lista somente snapshots pertencentes à conta autenticada. RLS continua
 * sendo a barreira de autorização; falhas viram estado de UI e nunca impedem
 * o jogo local.
 */
export async function listMyCloudSessions(): Promise<CloudSessionCatalogResult> {
  if (!isSupabaseConfigured()) return { records: [], error: null }
  const client = getSupabaseClient()
  if (!client) return { records: [], error: null }

  try {
    const {
      data: { session: authSession },
    } = await withTimeout(client.auth.getSession(), CATALOG_TIMEOUT_MS)
    if (!authSession?.user) return { records: [], error: null }

    const { data, error } = await withTimeout(
      client
        .from('online_sessions')
        .select('id, status, title, mode, session, created_at, updated_at')
        .eq('user_id', authSession.user.id)
        .in('status', ['active', 'archived'])
        .order('updated_at', { ascending: false })
        .limit(CATALOG_LIMIT),
      CATALOG_TIMEOUT_MS,
    )

    if (error || !data) return { records: [], error: 'unavailable' }

    const records = (data as Array<{
      id: string
      status: 'active' | 'archived'
      title: string
      mode: string
      session: TriviaSession
      created_at: string
      updated_at: string
    }>).filter((row) => Boolean(row.session?.id)).map((row) => ({
      rowId: row.id,
      status: row.status,
      title: row.title,
      mode: row.mode,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      session: row.session,
    }))

    return { records, error: null }
  } catch (error) {
    console.warn('[cloud-session-catalog] Não foi possível listar sessões da conta:', error)
    return { records: [], error: 'unavailable' }
  }
}
