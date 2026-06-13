/**
 * Testes de passagem de emailsByClientId em useGameHistorySync.
 *
 * Garante:
 *  - Quando participantes têm email, saveNormalizedGame recebe opts.emailsByClientId correto.
 *  - Quando nenhum participante tem email, saveNormalizedGame é chamado SEM emailsByClientId
 *    (ou com objeto vazio — verificamos que não passa a chave).
 */

// Mocks devem vir ANTES dos imports
jest.mock('@/modules/auth/services/normalized-history.service', () => ({
  saveNormalizedGame: jest.fn(),
}))

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn().mockReturnValue(true),
}))

import { renderHook, act } from '@testing-library/react'
import { useGameHistorySync } from '@/modules/auth/hooks/useGameHistorySync'
import { saveNormalizedGame } from '@/modules/auth/services/normalized-history.service'
import { isSupabaseConfigured } from '@/shared/services/supabase.client'
import type { TriviaSession } from '@/modules/trivia/types'
import type { User } from '@supabase/supabase-js'

const mockSaveNormalizedGame = saveNormalizedGame as jest.Mock
const mockIsSupabaseConfigured = isSupabaseConfigured as jest.Mock

const fakeUser = { id: 'user-1', email: 'host@example.com', user_metadata: {} } as unknown as User

function makeAnsweredTile() {
  return { id: `tile-${Math.random()}`, film: 'Film', points: 10, state: 'answered' as const, question: 'Q', answer: 'A' }
}

function makeAvailableTile() {
  return { id: `tile-${Math.random()}`, film: 'Film', points: 10, state: 'available' as const, question: 'Q', answer: 'A' }
}

function makeSession(overrides?: Partial<TriviaSession>): TriviaSession {
  return {
    id: 'sess-email-test',
    title: 'Partida Email',
    scheduledAt: new Date().toISOString(),
    theme: {
      id: 'default',
      name: 'Default',
      palette: { background: '#000', primary: '#fff', secondary: '#aaa', accent: '#bbb', surface: '#ccc' },
    },
    teams: [
      { id: 'team-a', name: 'Time A', color: '#f00', order: 0, members: ['p1'], score: 100 },
    ],
    participants: [
      { id: 'p1', name: 'Alice', role: 'player', teamId: 'team-a' },
    ],
    board: [{ id: 'col-1', filmId: 'f1', film: 'Film 1', tiles: [makeAnsweredTile()] }],
    activeTeamId: 'team-a',
    activeParticipantId: null,
    activeTurnIndex: 0,
    turnSequence: [],
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIsSupabaseConfigured.mockReturnValue(true)
  mockSaveNormalizedGame.mockResolvedValue(null)
})

describe('useGameHistorySync — emailsByClientId via opts', () => {
  it('passa emailsByClientId quando participantes têm email preenchido', async () => {
    const inProgress = makeSession({
      participants: [{ id: 'p1', name: 'Alice', role: 'player', teamId: 'team-a', email: 'alice@example.com' }],
      board: [{ id: 'col-1', filmId: 'f1', film: 'Film 1', tiles: [makeAnsweredTile(), makeAvailableTile()] }],
    })
    const finished = makeSession({
      participants: [{ id: 'p1', name: 'Alice', role: 'player', teamId: 'team-a', email: 'alice@example.com' }],
    })

    const { rerender } = renderHook(
      ({ session }) => useGameHistorySync({ session, gameMode: 'online', user: fakeUser }),
      { initialProps: { session: inProgress } },
    )

    await act(async () => {
      rerender({ session: finished })
    })

    expect(mockSaveNormalizedGame).toHaveBeenCalledTimes(1)
    expect(mockSaveNormalizedGame).toHaveBeenCalledWith(
      finished,
      expect.objectContaining({
        source: 'live',
        emailsByClientId: { p1: 'alice@example.com' },
      }),
    )
  })

  it('passa emailsByClientId apenas para participantes com email (mix)', async () => {
    const inProgress = makeSession({
      teams: [
        { id: 'team-a', name: 'Time A', color: '#f00', order: 0, members: ['p1', 'p2'], score: 100 },
      ],
      participants: [
        { id: 'p1', name: 'Alice', role: 'player', teamId: 'team-a', email: 'alice@example.com' },
        { id: 'p2', name: 'Bob', role: 'player', teamId: 'team-a' }, // sem email
      ],
      board: [{ id: 'col-1', filmId: 'f1', film: 'Film 1', tiles: [makeAnsweredTile(), makeAvailableTile()] }],
    })
    const finished = makeSession({
      teams: [
        { id: 'team-a', name: 'Time A', color: '#f00', order: 0, members: ['p1', 'p2'], score: 100 },
      ],
      participants: [
        { id: 'p1', name: 'Alice', role: 'player', teamId: 'team-a', email: 'alice@example.com' },
        { id: 'p2', name: 'Bob', role: 'player', teamId: 'team-a' },
      ],
    })

    const { rerender } = renderHook(
      ({ session }) => useGameHistorySync({ session, gameMode: 'online', user: fakeUser }),
      { initialProps: { session: inProgress } },
    )

    await act(async () => {
      rerender({ session: finished })
    })

    expect(mockSaveNormalizedGame).toHaveBeenCalledWith(
      finished,
      expect.objectContaining({
        source: 'live',
        emailsByClientId: { p1: 'alice@example.com' },
      }),
    )
    // p2 não deve aparecer no mapa
    const callOpts = mockSaveNormalizedGame.mock.calls[0][1] as Record<string, unknown>
    expect((callOpts.emailsByClientId as Record<string, string>)['p2']).toBeUndefined()
  })

  it('NÃO inclui emailsByClientId quando nenhum participante tem email', async () => {
    const inProgress = makeSession({
      board: [{ id: 'col-1', filmId: 'f1', film: 'Film 1', tiles: [makeAnsweredTile(), makeAvailableTile()] }],
    })
    const finished = makeSession()

    const { rerender } = renderHook(
      ({ session }) => useGameHistorySync({ session, gameMode: 'online', user: fakeUser }),
      { initialProps: { session: inProgress } },
    )

    await act(async () => {
      rerender({ session: finished })
    })

    expect(mockSaveNormalizedGame).toHaveBeenCalledTimes(1)
    const callOpts = mockSaveNormalizedGame.mock.calls[0][1] as Record<string, unknown>
    // emailsByClientId deve estar ausente (undefined) — a chave não é espalhada quando o mapa é vazio
    expect(callOpts['emailsByClientId']).toBeUndefined()
  })
})
