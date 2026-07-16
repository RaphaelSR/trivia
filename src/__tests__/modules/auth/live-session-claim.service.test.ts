jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

jest.mock('@/shared/services/vite-env', () => ({
  readViteEnv: jest.fn().mockImplementation((key: string) =>
    key === 'BASE_URL' ? '/trivia/' : undefined,
  ),
}))

import {
  buildLiveSessionClaimUrl,
  claimLiveSessionParticipant,
  getLiveSessionInvite,
  listLiveSessionParticipants,
  revokeLiveSessionClaim,
} from '@/modules/auth/services/live-session-claim.service'
import { getSupabaseClient, isSupabaseConfigured } from '@/shared/services/supabase.client'

const mockConfigured = isSupabaseConfigured as jest.Mock
const mockClient = getSupabaseClient as jest.Mock
const TOKEN = '550e8400-e29b-41d4-a716-446655440000'
const CLAIM_ID = 'b1f04c36-b6c8-49f9-80c7-2f994404a08c'

function authenticatedClient(rpc: jest.Mock) {
  return {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
      }),
    },
    rpc,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockConfigured.mockReturnValue(true)
})

it('monta /claim?session= respeitando BASE_URL', () => {
  expect(buildLiveSessionClaimUrl(TOKEN)).toContain(`/trivia/claim?session=${TOKEN}`)
})

it('reconcilia slots removidos antes de obter o convite', async () => {
  const rpc = jest.fn()
    .mockResolvedValueOnce({ data: 1, error: null })
    .mockResolvedValueOnce({
      data: [{ online_session_id: 'online-1', join_token: TOKEN }],
      error: null,
    })
  mockClient.mockReturnValue(authenticatedClient(rpc))

  const result = await getLiveSessionInvite('session-client-1')

  expect(rpc).toHaveBeenNthCalledWith(1, 'reconcile_my_live_claims', {
    p_session_client_id: 'session-client-1',
  })
  expect(rpc).toHaveBeenNthCalledWith(2, 'get_my_live_invite', {
    p_session_client_id: 'session-client-1',
  })
  expect(result.invite?.joinToken).toBe(TOKEN)
  expect(result.invite?.url).toContain('?session=')
})

it('mapeia tres times de tamanhos 1/2/3 sem expor e-mail', async () => {
  const rows = [
    ['a1', 'A1', 'Time A'],
    ['b1', 'B1', 'Time B'],
    ['b2', 'B2', 'Time B'],
    ['c1', 'C1', 'Time C'],
    ['c2', 'C2', 'Time C'],
    ['c3', 'C3', 'Time C'],
  ].map(([id, name, team], index) => ({
    participant_client_id: id,
    display_name: name,
    team_name: team,
    claimed: index === 0,
    claimed_by_me: index === 0,
    claimable: index !== 0,
    claim_id: index === 0 ? CLAIM_ID : null,
  }))
  const rpc = jest.fn().mockResolvedValue({ data: rows, error: null })
  mockClient.mockReturnValue(authenticatedClient(rpc))

  const result = await listLiveSessionParticipants(TOKEN)

  expect(result.error).toBeNull()
  expect(result.participants).toHaveLength(6)
  expect(result.participants.map((p) => p.teamName)).toEqual([
    'Time A', 'Time B', 'Time B', 'Time C', 'Time C', 'Time C',
  ])
  expect(JSON.stringify(result.participants)).not.toContain('email')
})

it('claim repetido devolvido pela RPC continua sendo sucesso idempotente', async () => {
  const rpc = jest.fn().mockResolvedValue({
    data: { sessionClientId: 'session-client-1', gameId: null, claimId: CLAIM_ID },
    error: null,
  })
  mockClient.mockReturnValue(authenticatedClient(rpc))

  const first = await claimLiveSessionParticipant(TOKEN, 'a1')
  const second = await claimLiveSessionParticipant(TOKEN, 'a1')

  expect(first).toEqual({ gameId: null, sessionClientId: 'session-client-1', error: null })
  expect(second).toEqual(first)
  expect(rpc).toHaveBeenCalledTimes(2)
})

it('mapeia reserva por e-mail sem revelar o endereço', async () => {
  const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'EMAIL_RESERVED' } })
  mockClient.mockReturnValue(authenticatedClient(rpc))

  const result = await claimLiveSessionParticipant(TOKEN, 'a1')

  expect(result.error).toBe('Este participante está reservado para outro e-mail.')
  expect(result.error).not.toContain('@')
})

it('revoga por RPC e não lança em falha de rede', async () => {
  const rpc = jest.fn()
    .mockResolvedValueOnce({ data: true, error: null })
    .mockRejectedValueOnce(new Error('offline'))
  mockClient.mockReturnValue(authenticatedClient(rpc))

  await expect(revokeLiveSessionClaim(CLAIM_ID)).resolves.toEqual({ revoked: true, error: null })
  await expect(revokeLiveSessionClaim(CLAIM_ID)).resolves.toEqual({
    revoked: false,
    error: 'Não consegui desvincular agora.',
  })
})

it('sem Supabase não executa RPC', async () => {
  mockConfigured.mockReturnValue(false)
  mockClient.mockReturnValue(null)

  const result = await getLiveSessionInvite('session-client-1')

  expect(result.invite).toBeNull()
  expect(mockClient).not.toHaveBeenCalled()
})
