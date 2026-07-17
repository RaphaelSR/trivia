import { getSupabaseClient, isSupabaseConfigured } from '@/shared/services/supabase.client'
import { readViteEnv } from '@/shared/services/vite-env'
import { i18n } from '@/shared/i18n'

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
    return { invite: null, error: i18n.t('auth:services.liveClaim.signInToInvite') }
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
        error: i18n.t('auth:services.liveClaim.prepareSafeFailure'),
      }
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { online_session_id?: string; join_token?: string }
      | null
    if (!row?.online_session_id || !row.join_token) {
      return {
        invite: null,
        error: i18n.t('auth:services.liveClaim.notSynced'),
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
      error: i18n.t('auth:services.liveClaim.prepareFailed'),
    }
  }
}

export async function listLiveSessionParticipants(
  joinToken: string,
): Promise<{ participants: LiveSessionParticipant[]; error: string | null }> {
  if (!UUID_RE.test(joinToken)) {
    return { participants: [], error: i18n.t('auth:services.liveClaim.invalidInvite') }
  }
  const client = await getAuthenticatedClient()
  if (!client) return { participants: [], error: i18n.t('auth:services.liveClaim.signInToView') }

  try {
    const { data, error } = await client.rpc('list_session_claimable_participants', {
      p_join_token: joinToken,
    })
    if (error) {
      console.warn('[listLiveSessionParticipants] Falha:', error)
      return { participants: [], error: i18n.t('auth:services.liveClaim.refreshFailed') }
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
    return { participants: [], error: i18n.t('auth:services.liveClaim.refreshFailed') }
  }
}

function mapClaimError(error: RpcError): string {
  if (error.message?.includes('INVALID_TOKEN')) return i18n.t('auth:services.liveClaim.expiredInvite')
  if (error.message?.includes('INVALID_PARTICIPANT')) return i18n.t('auth:services.liveClaim.missingParticipant')
  if (error.message?.includes('ALREADY_CLAIMED_IN_SESSION')) return i18n.t('auth:services.liveClaim.accountAlreadyClaimed')
  if (error.message?.includes('SLOT_UNAVAILABLE')) return i18n.t('auth:services.liveClaim.raceLost')
  if (error.message?.includes('EMAIL_RESERVED')) return i18n.t('auth:services.liveClaim.emailReserved')
  return i18n.t('auth:services.liveClaim.claimFailedRetry')
}

export async function claimLiveSessionParticipant(
  joinToken: string,
  participantClientId: string,
): Promise<{ gameId: string | null; sessionClientId: string | null; error: string | null }> {
  if (!UUID_RE.test(joinToken) || !participantClientId.trim()) {
    return { gameId: null, sessionClientId: null, error: i18n.t('auth:services.liveClaim.invalidInvite') }
  }
  const client = await getAuthenticatedClient()
  if (!client) {
    return { gameId: null, sessionClientId: null, error: i18n.t('auth:services.liveClaim.signInToClaim') }
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
    return { gameId: null, sessionClientId: null, error: i18n.t('auth:services.liveClaim.claimFailed') }
  }
}

export async function revokeLiveSessionClaim(
  claimId: string,
): Promise<{ revoked: boolean; error: string | null }> {
  if (!UUID_RE.test(claimId)) return { revoked: false, error: i18n.t('auth:services.liveClaim.invalidClaim') }
  const client = await getAuthenticatedClient()
  if (!client) return { revoked: false, error: i18n.t('auth:services.liveClaim.signInAsHost') }

  try {
    const { data, error } = await client.rpc('revoke_participant_claim', {
      p_claim_id: claimId,
    })
    if (error) {
      console.warn('[revokeLiveSessionClaim] Falha:', error)
      return { revoked: false, error: i18n.t('auth:services.liveClaim.revokeFailed') }
    }
    return data
      ? { revoked: true, error: null }
      : { revoked: false, error: i18n.t('auth:services.liveClaim.alreadyRevoked') }
  } catch {
    return { revoked: false, error: i18n.t('auth:services.liveClaim.revokeFailed') }
  }
}
