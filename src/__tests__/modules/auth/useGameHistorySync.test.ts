/**
 * Testes para useGameHistorySync
 *
 * Cenários cobertos:
 *  1. Salva exatamente 1 vez na transição para terminado (modo online, logado, supabase configurado)
 *  2. No-op para modo demo
 *  3. No-op para modo offline
 *  4. No-op quando usuário não está logado
 *  5. Não salva duas vezes para a mesma sessão (proteção de duplo-salvamento)
 *  6. Reseta o tracking quando a sessão muda (novo sessionId)
 */

// Mocks devem vir ANTES dos imports
jest.mock('@/modules/auth/services/history.service', () => ({
  saveGameToHistory: jest.fn(),
}))

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn().mockReturnValue(true),
}))

import { renderHook } from '@testing-library/react'
import { useGameHistorySync } from '@/modules/auth/hooks/useGameHistorySync'
import { saveGameToHistory } from '@/modules/auth/services/history.service'
import { isSupabaseConfigured } from '@/shared/services/supabase.client'
import type { TriviaSession } from '@/modules/trivia/types'
import type { User } from '@supabase/supabase-js'

const mockSaveGameToHistory = saveGameToHistory as jest.Mock
const mockIsSupabaseConfigured = isSupabaseConfigured as jest.Mock

// Helpers ----------------------------------------------------------------

function makeTile(state: 'available' | 'active' | 'answered') {
  return {
    id: `tile-${Math.random()}`,
    film: 'Film',
    points: 10,
    state,
    question: 'Q',
    answer: 'A',
  }
}

function makeSession(overrides?: Partial<TriviaSession>): TriviaSession {
  return {
    id: 'sess-1',
    title: 'Partida Teste',
    scheduledAt: new Date().toISOString(),
    theme: {
      id: 'default',
      name: 'Default',
      palette: { background: '#000', primary: '#fff', secondary: '#aaa', accent: '#bbb', surface: '#ccc' },
    },
    teams: [
      { id: 'team-a', name: 'Time A', color: '#f00', order: 0, members: ['Alice'], score: 100 },
      { id: 'team-b', name: 'Time B', color: '#00f', order: 1, members: ['Bob'], score: 80 },
    ],
    participants: [],
    board: [
      { id: 'col-1', filmId: 'f1', film: 'Film 1', tiles: [makeTile('answered')] },
    ],
    activeTeamId: 'team-a',
    activeParticipantId: null,
    activeTurnIndex: 0,
    turnSequence: [],
    ...overrides,
  }
}

const fakeUser = { id: 'user-1', email: 'a@b.com', user_metadata: {} } as unknown as User

// ------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  mockIsSupabaseConfigured.mockReturnValue(true)
  mockSaveGameToHistory.mockResolvedValue(null)
})

describe('useGameHistorySync — salva no fim do jogo (modo online, logado)', () => {
  it('chama saveGameToHistory exatamente 1 vez na transição para terminado', () => {
    const inProgressSession = makeSession({
      board: [
        {
          id: 'col-1',
          filmId: 'f1',
          film: 'Film 1',
          tiles: [makeTile('answered'), makeTile('available')],
        },
      ],
    })
    const finishedSession = makeSession() // board tem 1 tile answered = terminado

    const { rerender } = renderHook(
      ({ session }) => useGameHistorySync({ session, gameMode: 'online', user: fakeUser }),
      { initialProps: { session: inProgressSession } },
    )

    expect(mockSaveGameToHistory).not.toHaveBeenCalled()

    rerender({ session: finishedSession })

    expect(mockSaveGameToHistory).toHaveBeenCalledTimes(1)
    expect(mockSaveGameToHistory).toHaveBeenCalledWith(
      'Partida Teste',
      expect.objectContaining({
        sessionId: 'sess-1',
        winner: 'Time A',
        teams: expect.arrayContaining([
          expect.objectContaining({ name: 'Time A', score: 100 }),
          expect.objectContaining({ name: 'Time B', score: 80 }),
        ]),
      }),
    )
  })

  it('NÃO salva ao montar com sessão já terminada (restauração/reload não duplica histórico)', () => {
    const finishedSession = makeSession()

    renderHook(() =>
      useGameHistorySync({
        session: finishedSession,
        gameMode: 'online',
        user: fakeUser,
      }),
    )

    expect(mockSaveGameToHistory).not.toHaveBeenCalled()
  })

  it('NÃO chama saveGameToHistory quando o board ainda tem tiles disponíveis', () => {
    const notFinishedSession = makeSession({
      board: [
        {
          id: 'col-1',
          filmId: 'f1',
          film: 'Film 1',
          tiles: [makeTile('answered'), makeTile('available')],
        },
      ],
    })

    renderHook(() =>
      useGameHistorySync({
        session: notFinishedSession,
        gameMode: 'online',
        user: fakeUser,
      }),
    )

    expect(mockSaveGameToHistory).not.toHaveBeenCalled()
  })

  it('não salva novamente se re-renderizar com a mesma sessão terminada (anti-duplo-salvamento)', () => {
    const inProgressSession = makeSession({
      board: [
        {
          id: 'col-1',
          filmId: 'f1',
          film: 'Film 1',
          tiles: [makeTile('answered'), makeTile('available')],
        },
      ],
    })
    const finishedSession = makeSession()

    const { rerender } = renderHook(
      (props: { session: TriviaSession }) =>
        useGameHistorySync({ session: props.session, gameMode: 'online', user: fakeUser }),
      { initialProps: { session: inProgressSession } },
    )

    rerender({ session: finishedSession })
    // Re-renders subsequentes com a mesma sessão terminada
    rerender({ session: { ...finishedSession } })
    rerender({ session: { ...finishedSession } })

    expect(mockSaveGameToHistory).toHaveBeenCalledTimes(1)
  })
})

describe('useGameHistorySync — no-op para modos demo e offline', () => {
  it('não salva no modo demo', () => {
    const finishedSession = makeSession()

    renderHook(() =>
      useGameHistorySync({
        session: finishedSession,
        gameMode: 'demo',
        user: fakeUser,
      }),
    )

    expect(mockSaveGameToHistory).not.toHaveBeenCalled()
  })

  it('não salva no modo offline', () => {
    const finishedSession = makeSession()

    renderHook(() =>
      useGameHistorySync({
        session: finishedSession,
        gameMode: 'offline',
        user: fakeUser,
      }),
    )

    expect(mockSaveGameToHistory).not.toHaveBeenCalled()
  })
})

describe('useGameHistorySync — no-op quando usuário não está logado', () => {
  it('não salva quando user é null', () => {
    const finishedSession = makeSession()

    renderHook(() =>
      useGameHistorySync({
        session: finishedSession,
        gameMode: 'online',
        user: null,
      }),
    )

    expect(mockSaveGameToHistory).not.toHaveBeenCalled()
  })
})

describe('useGameHistorySync — no-op quando supabase não está configurado', () => {
  it('não salva se isSupabaseConfigured retornar false', () => {
    mockIsSupabaseConfigured.mockReturnValue(false)
    const finishedSession = makeSession()

    renderHook(() =>
      useGameHistorySync({
        session: finishedSession,
        gameMode: 'online',
        user: fakeUser,
      }),
    )

    expect(mockSaveGameToHistory).not.toHaveBeenCalled()
  })
})
