/**
 * Testes para normalized-history.service.ts
 *
 * Cenários:
 *  — buildNormalizedGamePayload:
 *    1. Estrutura completa com 2 times, 2 tiles (1 com answeredBy, 1 answered sem), 2 mimicaScores (1 void)
 *    2. Contadores corretos (events, recipients)
 *    3. Flags voided corretas
 *    4. started_at/ended_at = min/max dos timestamps reais (não nowIso)
 *    5. winner_client correto
 *    6. Empate → sem winner_client
 *    7. recipients corretos
 *  — saveNormalizedGame:
 *    8. No-op quando não configurado
 *    9. No-op quando usuário não logado
 *    10. Chama rpc com o payload correto quando logado
 *  — listNormalizedGames:
 *    11. [] quando não configurado
 *    12. Mapeamento correto com winner
 *    13. winner null quando winner_team_id = null
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import { isSupabaseConfigured, getSupabaseClient } from '@/shared/services/supabase.client'
import {
  buildNormalizedGamePayload,
  saveNormalizedGame,
  listNormalizedGames,
  listMyInvitedContacts,
} from '@/modules/auth/services/normalized-history.service'
import type { TriviaSession, MimicaScore } from '@/modules/trivia/types'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockGetClient = getSupabaseClient as jest.Mock

// ── Helpers ─────────────────────────────────────────────────────────────────

const NOW_ISO = '2026-06-12T12:00:00.000Z'
const TS_EARLY = '2026-06-12T10:00:00.000Z'
const TS_LATE = '2026-06-12T11:30:00.000Z'
const TS_MIMICA = '2026-06-12T11:45:00.000Z'

function makeSession(overrides?: Partial<TriviaSession>): TriviaSession {
  const session: TriviaSession = {
    id: 'sess-1',
    title: 'Copa Trivia',
    scheduledAt: '2026-06-12T09:00:00.000Z',
    theme: {
      id: 'default',
      name: 'Default',
      palette: {
        background: '#000',
        primary: '#fff',
        secondary: '#aaa',
        accent: '#bbb',
        surface: '#ccc',
      },
    },
    teams: [
      { id: 'team-a', name: 'Time A', color: '#f00', order: 0, members: ['Alice'], score: 100 },
      { id: 'team-b', name: 'Time B', color: '#00f', order: 1, members: ['Bob'], score: 80 },
    ],
    participants: [
      { id: 'part-1', name: 'Alice', role: 'player', teamId: 'team-a' },
      { id: 'part-2', name: 'Bob', role: 'player', teamId: 'team-b' },
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
              timestamp: TS_EARLY,
              turnNumber: 1,
              roundNumber: 1,
            },
          },
          {
            id: 'tile-2',
            film: 'Filme 1',
            points: 20,
            state: 'answered',
            question: 'Q2',
            answer: 'A2',
            // sem answeredBy → evento voided
          },
        ],
      },
    ],
    activeTeamId: 'team-a',
    activeParticipantId: null,
    activeTurnIndex: 0,
    turnSequence: [],
    mimicaScores: [
      {
        id: 'ms-1',
        participantId: 'part-2',
        teamId: 'team-b',
        pointsAwarded: 30,
        timestamp: TS_LATE,
        turnNumber: 2,
        roundNumber: 1,
        mode: 'full-current',
      } as MimicaScore,
      {
        id: 'ms-2',
        participantId: 'part-1',
        teamId: 'team-a',
        pointsAwarded: 0,
        timestamp: TS_MIMICA,
        turnNumber: 3,
        roundNumber: 1,
        mode: 'void',
      } as MimicaScore,
    ],
    ...overrides,
  }
  return session
}

// ── buildNormalizedGamePayload ───────────────────────────────────────────────

describe('buildNormalizedGamePayload', () => {
  it('gera estrutura com counts corretos', () => {
    const session = makeSession()
    const payload = buildNormalizedGamePayload(session, { source: 'live', nowIso: NOW_ISO })

    expect(payload.teams).toHaveLength(2)
    expect(payload.participants).toHaveLength(2)
    expect(payload.films).toHaveLength(1)
    expect(payload.questions).toHaveLength(2)
    // 1 trivia (com answeredBy) + 1 trivia voided + 1 mimica normal + 1 mimica void = 4
    expect(payload.events).toHaveLength(4)
  })

  it('tile com answeredBy → evento trivia não voided com 1 recipient', () => {
    const payload = buildNormalizedGamePayload(makeSession(), { source: 'live', nowIso: NOW_ISO })
    const triviaOk = payload.events.find(
      (e) => e.type === 'trivia' && e.question_client === 'tile-1',
    )
    expect(triviaOk).toBeDefined()
    expect(triviaOk!.voided).toBe(false)
    expect(triviaOk!.recipients).toHaveLength(1)
    expect(triviaOk!.recipients[0]).toMatchObject({
      team_client: 'team-a',
      participant_client: 'part-1',
      points: 10,
    })
  })

  it('tile answered sem answeredBy → evento trivia voided, recipients vazio', () => {
    const payload = buildNormalizedGamePayload(makeSession(), { source: 'live', nowIso: NOW_ISO })
    const triviaVoided = payload.events.find(
      (e) => e.type === 'trivia' && e.question_client === 'tile-2',
    )
    expect(triviaVoided).toBeDefined()
    expect(triviaVoided!.voided).toBe(true)
    expect(triviaVoided!.void_reason).toBe('respondida sem registro de destinatario')
    expect(triviaVoided!.occurred_at).toBe(NOW_ISO)
    expect(triviaVoided!.recipients).toHaveLength(0)
  })

  it('mimicaScore normal → evento mimica não voided com 1 recipient', () => {
    const payload = buildNormalizedGamePayload(makeSession(), { source: 'live', nowIso: NOW_ISO })
    const mimicaOk = payload.events.find((e) => e.type === 'mimica' && e.mode === 'full-current')
    expect(mimicaOk).toBeDefined()
    expect(mimicaOk!.voided).toBe(false)
    expect(mimicaOk!.recipients).toHaveLength(1)
    expect(mimicaOk!.recipients[0]).toMatchObject({
      team_client: 'team-b',
      participant_client: 'part-2',
      points: 30,
    })
  })

  it('mimicaScore void → evento mimica voided com recipients vazio', () => {
    const payload = buildNormalizedGamePayload(makeSession(), { source: 'live', nowIso: NOW_ISO })
    const mimicaVoid = payload.events.find((e) => e.type === 'mimica' && e.mode === 'void')
    expect(mimicaVoid).toBeDefined()
    expect(mimicaVoid!.voided).toBe(true)
    expect(mimicaVoid!.recipients).toHaveLength(0)
  })

  it('started_at = min dos timestamps reais; ended_at = max', () => {
    const payload = buildNormalizedGamePayload(makeSession(), { source: 'live', nowIso: NOW_ISO })
    // TS_EARLY (tile-1 answeredBy) = 10:00, TS_LATE (mimica normal) = 11:30, TS_MIMICA (mimica void) = 11:45
    expect(payload.game.started_at).toBe(TS_EARLY)
    expect(payload.game.ended_at).toBe(TS_MIMICA)
  })

  it('winner_client = time de maior score (Time A: 100 > Time B: 80)', () => {
    const payload = buildNormalizedGamePayload(makeSession(), { source: 'live', nowIso: NOW_ISO })
    expect(payload.winner_client).toBe('team-a')
  })

  it('empate → winner_client undefined', () => {
    const session = makeSession({
      teams: [
        { id: 'team-a', name: 'Time A', color: '#f00', order: 0, members: [], score: 50 },
        { id: 'team-b', name: 'Time B', color: '#00f', order: 1, members: [], score: 50 },
      ],
    })
    const payload = buildNormalizedGamePayload(session, { source: 'live', nowIso: NOW_ISO })
    expect(payload.winner_client).toBeUndefined()
  })

  it('snapshot contém a sessão original inteira', () => {
    const session = makeSession()
    const payload = buildNormalizedGamePayload(session, { source: 'live', nowIso: NOW_ISO })
    expect(payload.snapshot).toBe(session)
    expect(payload.source_ref).toBe('live-session')
  })

  it('teams mapeiam client_id, name, color, order, final_score corretamente', () => {
    const payload = buildNormalizedGamePayload(makeSession(), { source: 'live', nowIso: NOW_ISO })
    expect(payload.teams[0]).toMatchObject({
      client_id: 'team-a',
      name: 'Time A',
      color: '#f00',
      order: 0,
      final_score: 100,
    })
  })

  it('questions mapeiam film_client, points, state', () => {
    const payload = buildNormalizedGamePayload(makeSession(), { source: 'live', nowIso: NOW_ISO })
    const q1 = payload.questions.find((q) => q.client_id === 'tile-1')
    expect(q1).toBeDefined()
    expect(q1!.film_client).toBe('col-1')
    expect(q1!.points).toBe(10)
    expect(q1!.state).toBe('answered')
  })
})

// ── saveNormalizedGame ──────────────────────────────────────────────────────

describe('saveNormalizedGame — no-op sem configuração', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
  })

  it('retorna null sem chamar Supabase', async () => {
    const result = await saveNormalizedGame(makeSession(), { source: 'live', nowIso: NOW_ISO })
    expect(result).toBeNull()
    expect(mockGetClient).not.toHaveBeenCalled()
  })
})

describe('saveNormalizedGame — no-op quando usuário não logado', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      },
    })
  })

  it('retorna null', async () => {
    const result = await saveNormalizedGame(makeSession(), { source: 'live', nowIso: NOW_ISO })
    expect(result).toBeNull()
  })
})

describe('saveNormalizedGame — com sessão ativa', () => {
  const fakeUser = { id: 'user-uuid' }
  const fakeAuthSession = { user: fakeUser }

  it('chama rpc create_game_normalized com payload correto', async () => {
    const mockRpc = jest.fn().mockResolvedValue({ data: 'new-game-uuid', error: null })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }),
      },
      rpc: mockRpc,
    })

    const result = await saveNormalizedGame(makeSession(), { source: 'live' })

    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith(
      'create_game_normalized',
      expect.objectContaining({
        p: expect.objectContaining({
          game: expect.objectContaining({ source: 'live', title: 'Copa Trivia' }),
          teams: expect.arrayContaining([
            expect.objectContaining({ client_id: 'team-a' }),
          ]),
        }),
      }),
    )
    expect(result).toBe('new-game-uuid')
  })

  it('retorna null e não lança se rpc falhar', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const mockRpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'rpc error' } })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }),
      },
      rpc: mockRpc,
    })

    const result = await saveNormalizedGame(makeSession(), { source: 'live' })
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

// ── listNormalizedGames ─────────────────────────────────────────────────────

describe('listNormalizedGames — sem configuração', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
  })

  it('retorna [] sem chamar Supabase', async () => {
    const result = await listNormalizedGames()
    expect(result).toEqual([])
    expect(mockGetClient).not.toHaveBeenCalled()
  })
})

describe('listNormalizedGames — com sessão ativa', () => {
  const fakeUser = { id: 'user-uuid' }
  const fakeAuthSession = { user: fakeUser }

  function buildListQueryMock(resolvedValue: { data: unknown; error: unknown }) {
    const chain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(resolvedValue),
    }
    return chain
  }

  it('mapeia lista com winner via winner_team_id', async () => {
    const fakeRows = [
      {
        id: 'game-1',
        title: 'Jogo 1',
        played_at: '2026-06-12T09:00:00.000Z',
        ended_at: '2026-06-12T11:00:00.000Z',
        source: 'live',
        winner_team_id: 'gt-uuid-a',
        game_teams: [
          { id: 'gt-uuid-a', name: 'Time A', final_score: 100 },
          { id: 'gt-uuid-b', name: 'Time B', final_score: 80 },
        ],
      },
    ]
    const qm = buildListQueryMock({ data: fakeRows, error: null })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }),
      },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await listNormalizedGames()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'game-1',
      title: 'Jogo 1',
      winner: 'Time A',
      source: 'live',
      teams: [
        { name: 'Time A', score: 100 },
        { name: 'Time B', score: 80 },
      ],
    })
  })

  it('winner null quando winner_team_id é null', async () => {
    const fakeRows = [
      {
        id: 'game-2',
        title: 'Empate',
        played_at: null,
        ended_at: null,
        source: 'live',
        winner_team_id: null,
        game_teams: [
          { id: 'gt-c', name: 'Time C', final_score: 50 },
          { id: 'gt-d', name: 'Time D', final_score: 50 },
        ],
      },
    ]
    const qm = buildListQueryMock({ data: fakeRows, error: null })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }),
      },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await listNormalizedGames()
    expect(result[0].winner).toBeNull()
  })

  it('retorna [] quando usuário não está logado', async () => {
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      },
    })

    const result = await listNormalizedGames()
    expect(result).toEqual([])
  })

  it('retorna [] se query falhar', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const qm = buildListQueryMock({ data: null, error: { message: 'network error' } })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }),
      },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await listNormalizedGames()
    expect(result).toEqual([])
    warnSpy.mockRestore()
  })
})

// ── listMyInvitedContacts ───────────────────────────────────────────────────

describe('listMyInvitedContacts', () => {
  const fakeUser = { id: 'uid-host', email: 'host@example.com' }
  const fakeAuthSession = { user: fakeUser }

  it('retorna [] quando não configurado', async () => {
    mockIsConfigured.mockReturnValue(false)
    const result = await listMyInvitedContacts()
    expect(result).toEqual([])
  })

  it('retorna [] quando usuário não está logado', async () => {
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      },
    })
    const result = await listMyInvitedContacts()
    expect(result).toEqual([])
  })

  it('chama rpc list_my_invite_contacts e mapeia campos corretamente', async () => {
    const rpcMock = jest.fn().mockResolvedValue({
      data: [
        { invite_email: 'alice@example.com', last_display_name: 'Alice' },
        { invite_email: 'bob@example.com', last_display_name: 'Bob' },
      ],
      error: null,
    })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }),
      },
      rpc: rpcMock,
    })

    const result = await listMyInvitedContacts()
    expect(rpcMock).toHaveBeenCalledWith('list_my_invite_contacts')
    expect(result).toEqual([
      { email: 'alice@example.com', lastName: 'Alice' },
      { email: 'bob@example.com', lastName: 'Bob' },
    ])
  })

  it('retorna [] e não lança quando a RPC falha', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const rpcMock = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'rpc error' },
    })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }),
      },
      rpc: rpcMock,
    })

    const result = await listMyInvitedContacts()
    expect(result).toEqual([])
    warnSpy.mockRestore()
  })

  it('retorna [] quando a RPC devolve null (sem convites anteriores)', async () => {
    const rpcMock = jest.fn().mockResolvedValue({ data: null, error: null })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }),
      },
      rpc: rpcMock,
    })

    const result = await listMyInvitedContacts()
    expect(result).toEqual([])
  })
})
