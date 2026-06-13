/**
 * Testes para getGameDetail (normalized-history.service.ts)
 *
 * Cenários:
 *  1. no-op sem config → retorna null
 *  2. no-op quando usuário não logado → retorna null
 *  3. Monta GameDetail correto: ranking somado (trivia vs mimica), timeline ordenada, vencedor
 *  4. Retorna null quando query falha
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import { isSupabaseConfigured, getSupabaseClient } from '@/shared/services/supabase.client'
import { getGameDetail } from '@/modules/auth/services/normalized-history.service'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockGetClient = getSupabaseClient as jest.Mock

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const GAME_ID = 'game-uuid-1'

// DB UUIDs para times
const TEAM_A_ID = 'team-db-a'
const TEAM_B_ID = 'team-db-b'

// DB UUIDs para participantes
const PART_1_ID = 'part-db-1' // vinculado
const PART_2_ID = 'part-db-2'
const PART_3_ID = 'part-db-3'

// DB UUIDs para perguntas
const Q1_ID = 'q-db-1'
const Q2_ID = 'q-db-2'

// Evento trivia p1 acertou q1 às 10:00
const EVT_TRIVIA_EARLY = {
  id: 'evt-1',
  type: 'trivia' as const,
  question_id: Q1_ID,
  mode: null,
  turn_number: 1,
  round_number: 1,
  actor_participant_id: PART_1_ID,
  voided: false,
  void_reason: null,
  occurred_at: '2026-06-12T10:00:00.000Z',
  score_event_recipients: [
    { id: 'ser-1', event_id: 'evt-1', team_id: TEAM_A_ID, participant_id: PART_1_ID, points: 10 },
  ],
}

// Evento mimica p2 às 11:00
const EVT_MIMICA_MIDDLE = {
  id: 'evt-2',
  type: 'mimica' as const,
  question_id: null,
  mode: 'full-current',
  turn_number: 2,
  round_number: 1,
  actor_participant_id: PART_2_ID,
  voided: false,
  void_reason: null,
  occurred_at: '2026-06-12T11:00:00.000Z',
  score_event_recipients: [
    { id: 'ser-2', event_id: 'evt-2', team_id: TEAM_B_ID, participant_id: PART_2_ID, points: 30 },
  ],
}

// Evento trivia anulado às 11:30 — não deve contar para ranking
const EVT_TRIVIA_VOIDED = {
  id: 'evt-3',
  type: 'trivia' as const,
  question_id: Q2_ID,
  mode: null,
  turn_number: 3,
  round_number: 1,
  actor_participant_id: PART_3_ID,
  voided: true,
  void_reason: 'anulado',
  occurred_at: '2026-06-12T11:30:00.000Z',
  score_event_recipients: [],
}

// Evento trivia p1 acertou q2 às 12:00
const EVT_TRIVIA_LATE = {
  id: 'evt-4',
  type: 'trivia' as const,
  question_id: Q2_ID,
  mode: null,
  turn_number: 4,
  round_number: 1,
  actor_participant_id: PART_1_ID,
  voided: false,
  void_reason: null,
  occurred_at: '2026-06-12T12:00:00.000Z',
  score_event_recipients: [
    { id: 'ser-4', event_id: 'evt-4', team_id: TEAM_A_ID, participant_id: PART_1_ID, points: 20 },
  ],
}

const JOIN_TOKEN = 'join-uuid-0000-0000-0000-000000000000'
const OWNER_USER_ID = 'user-uuid'

const FAKE_ROW = {
  id: GAME_ID,
  title: 'Copa Trivia',
  played_at: '2026-06-12T09:00:00.000Z',
  started_at: '2026-06-12T10:00:00.000Z',
  ended_at: '2026-06-12T12:00:00.000Z',
  source: 'live',
  winner_team_id: TEAM_A_ID,
  join_token: JOIN_TOKEN,
  owner_user_id: OWNER_USER_ID,
  game_teams: [
    { id: TEAM_A_ID, client_id: 'client-a', name: 'Time A', color: '#f00', final_score: 100 },
    { id: TEAM_B_ID, client_id: 'client-b', name: 'Time B', color: '#00f', final_score: 80 },
  ],
  game_participants: [
    { id: PART_1_ID, client_id: 'p1', display_name: 'Alice', team_id: TEAM_A_ID, profile_id: 'profile-uuid-alice', claim_token: null },
    { id: PART_2_ID, client_id: 'p2', display_name: 'Bob', team_id: TEAM_B_ID, profile_id: null, claim_token: 'token-bob-uuid' },
    { id: PART_3_ID, client_id: 'p3', display_name: 'Carol', team_id: TEAM_B_ID, profile_id: null, claim_token: null },
  ],
  game_films: [
    { id: 'film-1', client_id: 'f1', name: 'Filme 1', order: 0 },
  ],
  game_questions: [
    { id: Q1_ID, client_id: 'q1', film_id: 'film-1', points: 10, question: 'P1?', answer: 'R1', state: 'answered' },
    { id: Q2_ID, client_id: 'q2', film_id: 'film-1', points: 20, question: 'P2?', answer: 'R2', state: 'answered' },
  ],
  score_events: [EVT_TRIVIA_EARLY, EVT_MIMICA_MIDDLE, EVT_TRIVIA_VOIDED, EVT_TRIVIA_LATE],
}

function buildSingleQueryMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
  }
  return chain
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getGameDetail — sem configuração', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
  })

  it('retorna null sem chamar Supabase', async () => {
    const result = await getGameDetail(GAME_ID)
    expect(result).toBeNull()
    expect(mockGetClient).not.toHaveBeenCalled()
  })
})

describe('getGameDetail — usuário não logado', () => {
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
    const result = await getGameDetail(GAME_ID)
    expect(result).toBeNull()
  })
})

describe('getGameDetail — com sessão ativa', () => {
  const fakeAuthSession = { user: { id: OWNER_USER_ID } }

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
  })

  it('monta GameDetail com ranking correto (trivia vs mimica)', async () => {
    const qm = buildSingleQueryMock({ data: FAKE_ROW, error: null })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }) },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await getGameDetail(GAME_ID)

    expect(result).not.toBeNull()
    expect(result!.id).toBe(GAME_ID)
    expect(result!.title).toBe('Copa Trivia')
    expect(result!.winner_team_name).toBe('Time A')

    // Ranking: Alice (trivia 10+20=30, mimica 0), Bob (trivia 0, mimica 30), Carol (0,0)
    expect(result!.ranking).toHaveLength(3)

    const alice = result!.ranking.find((r) => r.display_name === 'Alice')!
    expect(alice.trivia_points).toBe(30) // 10 + 20 (evento voided não conta)
    expect(alice.mimica_points).toBe(0)
    expect(alice.total_points).toBe(30)
    expect(alice.profile_id).toBe('profile-uuid-alice')

    const bob = result!.ranking.find((r) => r.display_name === 'Bob')!
    expect(bob.trivia_points).toBe(0)
    expect(bob.mimica_points).toBe(30)
    expect(bob.total_points).toBe(30)
    expect(bob.profile_id).toBeNull()

    const carol = result!.ranking.find((r) => r.display_name === 'Carol')!
    expect(carol.total_points).toBe(0)

    // Primeiro lugar: Alice ou Bob (empatados em 30), Carol em último
    expect(result!.ranking[result!.ranking.length - 1].display_name).toBe('Carol')
  })

  it('timeline ordenada por occurred_at asc', async () => {
    const qm = buildSingleQueryMock({ data: FAKE_ROW, error: null })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }) },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await getGameDetail(GAME_ID)
    expect(result).not.toBeNull()

    const times = result!.timeline.map((e) => e.occurred_at)
    const sorted = [...times].sort()
    expect(times).toEqual(sorted)

    // Contém os 4 eventos (incluindo voided)
    expect(result!.timeline).toHaveLength(4)

    // Primeiro evento = trivia às 10:00
    expect(result!.timeline[0].type).toBe('trivia')
    expect(result!.timeline[0].occurred_at).toBe('2026-06-12T10:00:00.000Z')
    expect(result!.timeline[0].actor_name).toBe('Alice')

    // Evento voided marcado
    const voided = result!.timeline.find((e) => e.voided)
    expect(voided).toBeDefined()
    expect(voided!.voided).toBe(true)
  })

  it('vencedor correto via winner_team_id', async () => {
    const qm = buildSingleQueryMock({ data: FAKE_ROW, error: null })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }) },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await getGameDetail(GAME_ID)
    expect(result!.winner_team_id).toBe(TEAM_A_ID)
    expect(result!.winner_team_name).toBe('Time A')
  })

  it('retorna null e não lança quando query falha', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const qm = buildSingleQueryMock({ data: null, error: { message: 'not found' } })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }) },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await getGameDetail(GAME_ID)
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('inclui times, filmes e perguntas no resultado', async () => {
    const qm = buildSingleQueryMock({ data: FAKE_ROW, error: null })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }) },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await getGameDetail(GAME_ID)
    expect(result!.teams).toHaveLength(2)
    expect(result!.films).toHaveLength(1)
    expect(result!.questions).toHaveLength(2)
    expect(result!.participants).toHaveLength(3)
  })

  it('inclui claim_token e profile_id nos participantes', async () => {
    const qm = buildSingleQueryMock({ data: FAKE_ROW, error: null })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }) },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await getGameDetail(GAME_ID)
    expect(result).not.toBeNull()

    const alice = result!.participants.find((p) => p.display_name === 'Alice')!
    expect(alice.profile_id).toBe('profile-uuid-alice')
    expect(alice.claim_token).toBeNull()

    const bob = result!.participants.find((p) => p.display_name === 'Bob')!
    expect(bob.profile_id).toBeNull()
    expect(bob.claim_token).toBe('token-bob-uuid')

    // claim_token também aparece no ranking
    const bobRanking = result!.ranking.find((r) => r.display_name === 'Bob')!
    expect(bobRanking.claim_token).toBe('token-bob-uuid')
  })

  it('isOwner=true e joinToken presente quando user.id === owner_user_id', async () => {
    const qm = buildSingleQueryMock({ data: FAKE_ROW, error: null })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }) },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await getGameDetail(GAME_ID)
    expect(result).not.toBeNull()
    expect(result!.isOwner).toBe(true)
    expect(result!.joinToken).toBe(JOIN_TOKEN)
  })

  it('isOwner=false e joinToken=null quando user.id !== owner_user_id', async () => {
    const rowWithDifferentOwner = { ...FAKE_ROW, owner_user_id: 'outro-user-uuid' }
    const qm = buildSingleQueryMock({ data: rowWithDifferentOwner, error: null })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }) },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await getGameDetail(GAME_ID)
    expect(result).not.toBeNull()
    expect(result!.isOwner).toBe(false)
    expect(result!.joinToken).toBeNull()
  })

  it('isOwner=false quando owner_user_id é null', async () => {
    const rowNoOwner = { ...FAKE_ROW, owner_user_id: null }
    const qm = buildSingleQueryMock({ data: rowNoOwner, error: null })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }) },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await getGameDetail(GAME_ID)
    expect(result).not.toBeNull()
    expect(result!.isOwner).toBe(false)
    expect(result!.joinToken).toBeNull()
  })
})
