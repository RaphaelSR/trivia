import { getSupabaseClient, isSupabaseConfigured } from '@/shared/services/supabase.client'
import { readViteEnv } from '@/shared/services/vite-env'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type LiveSessionInvite = {
  onlineSessionId: string
  joinToken: string
  url: string
}

export type LiveSessionParticipant = {
  participantClientId: string
  displayName: string
  teamName: string | null
  claimed: boolean
  claimedByMe: boolean
  claimable: boolean
  claimId: string | null
}

type RpcError = { message?: string }

function normalizeBase(): string {
  const base = readViteEnv('BASE_URL') ?? '/'
  return base.endsWith('/') ? base : `${base}/`
}

export function buildLiveSessionClaimUrl(joinToken: string): string {
  const path = `${normalizeBase()}claim?session=${joinToken}`
  const origin = typeof window !== 'undefined' ? (window.location?.origin ?? '') : ''
  return origin ? `${origin}${path.startsWith('/') ? path : `/${path}`}` : path
}

async function getAuthenticatedClient() {
  if (!isSupabaseConfigured()) return null
  const client = getSupabaseClient()!
  const {
    data: { session },
  } = await client.auth.getSession()
  return session?.user ? client : null
}

/**
 * Obtém/rotaciona o convite somente depois de o caller forçar o sync.
 * A reconciliação revoga slots removidos; qualquer falha fica isolada do jogo.
 */
export async function getLiveSessionInvite(
  sessionClientId: string,
): Promise<{ invite: LiveSessionInvite | null; error: string | null }> {
  const client = await getAuthenticatedClient()
  if (!client) {
    return { invite: null, error: 'Entre na sua conta para criar o convite.' }
  }

  try {
    const reconcile = await client.rpc('reconcile_my_live_claims', {
      p_session_client_id: sessionClientId,
    })
    if (reconcile.error) {
      console.warn('[getLiveSessionInvite] Falha ao reconciliar claims:', reconcile.error)
    }

    const { data, error } = await client.rpc('get_my_live_invite', {
      p_session_client_id: sessionClientId,
    })
    if (error) {
      console.warn('[getLiveSessionInvite] Falha:', error)
      return {
        invite: null,
        error: 'Não consegui preparar o convite agora. O jogo continua salvo normalmente.',
      }
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { online_session_id?: string; join_token?: string }
      | null
    if (!row?.online_session_id || !row.join_token) {
      return {
        invite: null,
        error: 'A sessão ainda não chegou à nuvem. Tente sincronizar novamente.',
      }
    }

    return {
      invite: {
        onlineSessionId: row.online_session_id,
        joinToken: row.join_token,
        url: buildLiveSessionClaimUrl(row.join_token),
      },
      error: null,
    }
  } catch (error) {
    console.warn('[getLiveSessionInvite] Falha inesperada:', error)
    return {
      invite: null,
      error: 'Não consegui preparar o convite agora. Tente novamente.',
    }
  }
}

export async function listLiveSessionParticipants(
  joinToken: string,
): Promise<{ participants: LiveSessionParticipant[]; error: string | null }> {
  if (!UUID_RE.test(joinToken)) {
    return { participants: [], error: 'Link de convite inválido.' }
  }
  const client = await getAuthenticatedClient()
  if (!client) return { participants: [], error: 'Entre para ver os participantes.' }

  try {
    const { data, error } = await client.rpc('list_session_claimable_participants', {
      p_join_token: joinToken,
    })
    if (error) {
      console.warn('[listLiveSessionParticipants] Falha:', error)
      return { participants: [], error: 'Não consegui atualizar a lista agora.' }
    }

    const rows = (data ?? []) as Array<{
      participant_client_id: string
      display_name: string
      team_name: string | null
      claimed: boolean
      claimed_by_me: boolean
      claimable: boolean
      claim_id: string | null
    }>
    return {
      participants: rows.map((row) => ({
        participantClientId: row.participant_client_id,
        displayName: row.display_name,
        teamName: row.team_name,
        claimed: row.claimed,
        claimedByMe: row.claimed_by_me,
        claimable: row.claimable,
        claimId: row.claim_id,
      })),
      error: null,
    }
  } catch {
    return { participants: [], error: 'Não consegui atualizar a lista agora.' }
  }
}

const CLAIM_ERRORS: Record<string, string> = {
  INVALID_TOKEN: 'Este convite não é mais válido.',
  INVALID_PARTICIPANT: 'Este participante não está mais disponível.',
  ALREADY_CLAIMED_IN_SESSION: 'Sua conta já está ligada a outra pessoa nesta partida.',
  SLOT_UNAVAILABLE: 'Outra pessoa acabou de reivindicar este participante.',
  EMAIL_RESERVED: 'Este participante está reservado para outro e-mail.',
}

function mapClaimError(error: RpcError): string {
  const known = Object.keys(CLAIM_ERRORS).find((key) => error.message?.includes(key))
  return known ? CLAIM_ERRORS[known] : 'Não consegui vincular agora. Tente novamente.'
}

export async function claimLiveSessionParticipant(
  joinToken: string,
  participantClientId: string,
): Promise<{ gameId: string | null; sessionClientId: string | null; error: string | null }> {
  if (!UUID_RE.test(joinToken) || !participantClientId.trim()) {
    return { gameId: null, sessionClientId: null, error: 'Link de convite inválido.' }
  }
  const client = await getAuthenticatedClient()
  if (!client) {
    return { gameId: null, sessionClientId: null, error: 'Entre para reivindicar.' }
  }

  try {
    const { data, error } = await client.rpc('claim_session_participant', {
      p_join_token: joinToken,
      p_participant_client_id: participantClientId,
    })
    if (error) {
      return { gameId: null, sessionClientId: null, error: mapClaimError(error) }
    }
    const result = data as { gameId?: string | null; sessionClientId?: string | null } | null
    return {
      gameId: result?.gameId ?? null,
      sessionClientId: result?.sessionClientId ?? null,
      error: null,
    }
  } catch {
    return { gameId: null, sessionClientId: null, error: 'Não consegui vincular agora.' }
  }
}

export async function revokeLiveSessionClaim(
  claimId: string,
): Promise<{ revoked: boolean; error: string | null }> {
  if (!UUID_RE.test(claimId)) return { revoked: false, error: 'Claim inválido.' }
  const client = await getAuthenticatedClient()
  if (!client) return { revoked: false, error: 'Entre na conta do anfitrião.' }

  try {
    const { data, error } = await client.rpc('revoke_participant_claim', {
      p_claim_id: claimId,
    })
    if (error) {
      console.warn('[revokeLiveSessionClaim] Falha:', error)
      return { revoked: false, error: 'Não consegui desvincular agora.' }
    }
    return data
      ? { revoked: true, error: null }
      : { revoked: false, error: 'Este vínculo já não estava ativo.' }
  } catch {
    return { revoked: false, error: 'Não consegui desvincular agora.' }
  }
}
