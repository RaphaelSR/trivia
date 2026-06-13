/**
 * Testes para as novas funções de vínculo participante → conta:
 *   - linkMyParticipations
 *   - claimParticipation
 *   - importLocalSession
 *   - buildNormalizedGamePayload (extensão: emailsByClientId → invite_email)
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import { isSupabaseConfigured, getSupabaseClient } from '@/shared/services/supabase.client'
import {
  linkMyParticipations,
  claimParticipation,
  importLocalSession,
  buildNormalizedGamePayload,
} from '@/modules/auth/services/normalized-history.service'
import type { TriviaSession } from '@/modules/trivia/types'
import type { SessionRecord } from '@/modules/game/infrastructure/session.repository'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockGetClient = getSupabaseClient as jest.Mock

// ── Helpers ──────────────────────────────────────────────────────────────────

const NOW_ISO = '2026-06-12T12:00:00.000Z'
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

function makeSession(overrides?: Partial<TriviaSession>): TriviaSession {
  return {
    id: 'sess-1',
    title: 'Copa Trivia',
    scheduledAt: '2026-06-12T09:00:00.000Z',
    theme: {
      id: 'default',
      name: 'Default',
      palette: { background: '#000', primary: '#fff', secondary: '#aaa', accent: '#bbb', surface: '#ccc' },
    },
    teams: [
      { id: 'team-a', name: 'Time A', color: '#f00', order: 0, members: ['Alice'], score: 100 },
    ],
    participants: [
      { id: 'part-1', name: 'Alice', role: 'player', teamId: 'team-a' },
      { id: 'part-2', name: 'Bob', role: 'player', teamId: 'team-a' },
    ],
    board: [
      {
        id: 'col-1',
        filmId: 'f1',
        film: 'Filme 1',
        tiles: [
          {
            id: 'tile-1',
            film: 'Filme 1',
            points: 10,
            state: 'answered',
            question: 'Q1',
            answer: 'A1',
            answeredBy: {
              participantId: 'part-1',
              teamId: 'team-a',
              pointsAwarded: 10,
              timestamp: NOW_ISO,
            },
          },
        ],
      },
    ],
    activeTeamId: 'team-a',
    activeParticipantId: null,
    activeTurnIndex: 0,
    turnSequence: [],
    ...overrides,
  }
}

function makeRecord(overrides?: Partial<SessionRecord>): SessionRecord {
  return {
    metadata: {
      id: 'sess-1',
      name: 'Copa Trivia',
      createdAt: NOW_ISO,
      lastModified: NOW_ISO,
      isActive: false,
      mode: 'offline',
      duration: 30,
      isSaved: true,
    },
    session: makeSession(),
    ...overrides,
  }
}

function makeFakeClient(rpcResult: { data: unknown; error: unknown }) {
  return {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-uuid', email: 'a@b.com' } } },
      }),
    },
    rpc: jest.fn().mockResolvedValue(rpcResult),
  }
}

// ── buildNormalizedGamePayload: invite_email ──────────────────────────────────

describe('buildNormalizedGamePayload — emailsByClientId', () => {
  it('preenche invite_email quando emailsByClientId é fornecido', () => {
    const session = makeSession()
    const payload = buildNormalizedGamePayload(session, {
      source: 'import',
      nowIso: NOW_ISO,
      emailsByClientId: { 'part-1': 'alice@example.com', 'part-2': 'bob@example.com' },
    })

    const alice = payload.participants.find((p) => p.client_id === 'part-1')
    const bob = payload.participants.find((p) => p.client_id === 'part-2')

    expect(alice?.invite_email).toBe('alice@example.com')
    expect(bob?.invite_email).toBe('bob@example.com')
  })

  it('invite_email é undefined quando emailsByClientId não é fornecido', () => {
    const session = makeSession()
    const payload = buildNormalizedGamePayload(session, { source: 'live', nowIso: NOW_ISO })

    for (const p of payload.participants) {
      expect(p.invite_email).toBeUndefined()
    }
  })

  it('invite_email é undefined para participantes sem entrada no mapa', () => {
    const session = makeSession()
    const payload = buildNormalizedGamePayload(session, {
      source: 'import',
      nowIso: NOW_ISO,
      emailsByClientId: { 'part-1': 'alice@example.com' }, // apenas Alice
    })

    const bob = payload.participants.find((p) => p.client_id === 'part-2')
    expect(bob?.invite_email).toBeUndefined()
  })

  it('source: import → source_ref é "import"', () => {
    const payload = buildNormalizedGamePayload(makeSession(), { source: 'import', nowIso: NOW_ISO })
    expect(payload.game.source).toBe('import')
    expect(payload.source_ref).toBe('import')
  })
})

// ── linkMyParticipations ──────────────────────────────────────────────────────

describe('linkMyParticipations — no-op sem configuração', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
  })

  it('retorna 0 sem chamar Supabase', async () => {
    const result = await linkMyParticipations()
    expect(result).toBe(0)
    expect(mockGetClient).not.toHaveBeenCalled()
  })
})

describe('linkMyParticipations — no-op sem usuário logado', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
    })
  })

  it('retorna 0', async () => {
    const result = await linkMyParticipations()
    expect(result).toBe(0)
  })
})

describe('linkMyParticipations — com usuário logado', () => {
  it('chama rpc link_my_participations e retorna o count', async () => {
    const mockRpc = jest.fn().mockResolvedValue({ data: 3, error: null })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { user: { id: 'uid' } } },
        }),
      },
      rpc: mockRpc,
    })

    const result = await linkMyParticipations()

    expect(mockRpc).toHaveBeenCalledWith('link_my_participations')
    expect(result).toBe(3)
  })

  it('retorna 0 se rpc falhar (sem lançar)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const mockRpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'err' } })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { user: { id: 'uid' } } },
        }),
      },
      rpc: mockRpc,
    })

    const result = await linkMyParticipations()
    expect(result).toBe(0)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

// ── claimParticipation ────────────────────────────────────────────────────────

describe('claimParticipation — validação de UUID', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue(null)
  })

  it('retorna erro para token que não é UUID', async () => {
    const result = await claimParticipation('not-a-uuid')
    expect(result.gameId).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('retorna erro para string vazia', async () => {
    const result = await claimParticipation('')
    expect(result.gameId).toBeNull()
    expect(result.error).toBeTruthy()
  })
})

describe('claimParticipation — no-op sem configuração', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
  })

  it('retorna erro sem chamar Supabase', async () => {
    const result = await claimParticipation(VALID_UUID)
    expect(result.gameId).toBeNull()
    expect(result.error).toBeTruthy()
    expect(mockGetClient).not.toHaveBeenCalled()
  })
})

describe('claimParticipation — sem usuário logado', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
    })
  })

  it('retorna erro de autenticação', async () => {
    const result = await claimParticipation(VALID_UUID)
    expect(result.gameId).toBeNull()
    expect(result.error).toBeTruthy()
  })
})

describe('claimParticipation — com usuário logado', () => {
  it('chama rpc claim_participant com p_token correto e retorna gameId', async () => {
    const fakeGameId = 'game-uuid-123'
    const client = makeFakeClient({ data: fakeGameId, error: null })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue(client)

    const result = await claimParticipation(VALID_UUID)

    expect(client.rpc).toHaveBeenCalledWith('claim_participant', { p_token: VALID_UUID })
    expect(result.gameId).toBe(fakeGameId)
    expect(result.error).toBeNull()
  })

  it('retorna erro quando rpc retorna null (token inválido/já usado)', async () => {
    const client = makeFakeClient({ data: null, error: null })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue(client)

    const result = await claimParticipation(VALID_UUID)
    expect(result.gameId).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('retorna erro quando rpc falha (sem lançar)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const client = makeFakeClient({ data: null, error: { message: 'rpc error' } })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue(client)

    const result = await claimParticipation(VALID_UUID)
    expect(result.gameId).toBeNull()
    expect(result.error).toBeTruthy()
    warnSpy.mockRestore()
  })
})

// ── importLocalSession ────────────────────────────────────────────────────────

describe('importLocalSession — no-op sem configuração', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
  })

  it('retorna erro sem chamar Supabase', async () => {
    const result = await importLocalSession(makeRecord())
    expect(result.gameId).toBeNull()
    expect(result.error).toBeTruthy()
    expect(mockGetClient).not.toHaveBeenCalled()
  })
})

describe('importLocalSession — sem usuário logado', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
    })
  })

  it('retorna erro de autenticação', async () => {
    const result = await importLocalSession(makeRecord())
    expect(result.gameId).toBeNull()
    expect(result.error).toBeTruthy()
  })
})

describe('importLocalSession — com usuário logado', () => {
  it('chama rpc create_game_normalized com source "import"', async () => {
    const fakeGameId = 'new-game-uuid'
    const client = makeFakeClient({ data: fakeGameId, error: null })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue(client)

    const result = await importLocalSession(makeRecord())

    expect(client.rpc).toHaveBeenCalledWith(
      'create_game_normalized',
      expect.objectContaining({
        p: expect.objectContaining({
          game: expect.objectContaining({ source: 'import' }),
        }),
      }),
    )
    expect(result.gameId).toBe(fakeGameId)
    expect(result.error).toBeNull()
  })

  it('aplica emailsByClientId ao payload', async () => {
    const client = makeFakeClient({ data: 'gid', error: null })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue(client)

    await importLocalSession(makeRecord(), {
      emailsByClientId: { 'part-1': 'alice@example.com' },
    })

    const call = (client.rpc as jest.Mock).mock.calls[0]
    const payload = call[1].p
    const alice = payload.participants.find((p: { client_id: string }) => p.client_id === 'part-1')
    expect(alice?.invite_email).toBe('alice@example.com')
  })

  it('retorna erro quando rpc falha (sem lançar)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const client = makeFakeClient({ data: null, error: { message: 'rpc error' } })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue(client)

    const result = await importLocalSession(makeRecord())
    expect(result.gameId).toBeNull()
    expect(result.error).toBeTruthy()
    warnSpy.mockRestore()
  })
})
