jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import { isSupabaseConfigured, getSupabaseClient } from '@/shared/services/supabase.client'
import { saveSessionSnapshot, listSessionSnapshots } from '@/modules/game/infrastructure/session-snapshot.service'
import type { TriviaSession } from '@/modules/trivia/types'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockGetClient = getSupabaseClient as jest.Mock

function makeSession(): TriviaSession {
  return {
    id: 'sess-1',
    title: 'T',
    scheduledAt: '2026-01-01T00:00:00.000Z',
    theme: { id: 'd', name: 'D', palette: { background: '#000', primary: '#fff', secondary: '#a', accent: '#b', surface: '#c' } },
    teams: [],
    participants: [],
    board: [],
    activeTeamId: '',
    activeParticipantId: null,
    activeTurnIndex: 0,
    turnSequence: [],
  }
}

const authedAuth = { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }) }
const noAuth = { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) }

beforeEach(() => {
  jest.clearAllMocks()
  mockIsConfigured.mockReturnValue(true)
})

describe('session-snapshot.service — saveSessionSnapshot', () => {
  it('no-op quando supabase não configurado', async () => {
    mockIsConfigured.mockReturnValue(false)
    await saveSessionSnapshot('sess-1', 'T', makeSession())
    expect(mockGetClient).not.toHaveBeenCalled()
  })

  it('no-op quando deslogado', async () => {
    const rpc = jest.fn()
    mockGetClient.mockReturnValue({ auth: noAuth, rpc })
    await saveSessionSnapshot('sess-1', 'T', makeSession())
    expect(rpc).not.toHaveBeenCalled()
  })

  it('chama a RPC save_session_snapshot com os args corretos quando logado', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'snap-1', error: null })
    mockGetClient.mockReturnValue({ auth: authedAuth, rpc })
    const session = makeSession()

    await saveSessionSnapshot('sess-1', 'Minha Partida', session)

    expect(rpc).toHaveBeenCalledWith('save_session_snapshot', {
      p_client_session_id: 'sess-1',
      p_title: 'Minha Partida',
      p_session: session,
    })
  })

  it('não lança quando a RPC falha', async () => {
    const rpc = jest.fn().mockRejectedValue(new Error('net'))
    mockGetClient.mockReturnValue({ auth: authedAuth, rpc })
    await expect(saveSessionSnapshot('sess-1', 'T', makeSession())).resolves.toBeUndefined()
  })
})

describe('session-snapshot.service — listSessionSnapshots', () => {
  it('[] quando não configurado', async () => {
    mockIsConfigured.mockReturnValue(false)
    expect(await listSessionSnapshots('sess-1')).toEqual([])
  })

  it('mapeia as linhas (created_at → createdAt) ordenadas pela query', async () => {
    const rows = [
      { id: 's2', created_at: '2026-06-14T12:00:00.000Z', title: 'T', session: makeSession() },
      { id: 's1', created_at: '2026-06-14T11:00:00.000Z', title: 'T', session: makeSession() },
    ]
    const order = jest.fn().mockResolvedValue({ data: rows, error: null })
    const eq = jest.fn().mockReturnValue({ order })
    const select = jest.fn().mockReturnValue({ eq })
    const from = jest.fn().mockReturnValue({ select })
    mockGetClient.mockReturnValue({ auth: authedAuth, from })

    const result = await listSessionSnapshots('sess-1')

    expect(from).toHaveBeenCalledWith('online_session_snapshots')
    expect(eq).toHaveBeenCalledWith('client_session_id', 'sess-1')
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 's2', createdAt: '2026-06-14T12:00:00.000Z' })
  })

  it('[] quando a query retorna erro', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const eq = jest.fn().mockReturnValue({ order })
    const select = jest.fn().mockReturnValue({ eq })
    const from = jest.fn().mockReturnValue({ select })
    mockGetClient.mockReturnValue({ auth: authedAuth, from })
    expect(await listSessionSnapshots('sess-1')).toEqual([])
  })
})
