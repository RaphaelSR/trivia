import '@testing-library/jest-dom'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { TriviaSessionProvider } from '@/modules/trivia/providers/TriviaSessionProvider'
import { useTriviaSession } from '@/modules/trivia/hooks/useTriviaSession'
import { useGameMode } from '@/hooks/useGameMode'
import { DEFAULT_DEMO_SESSION_CONFIG } from '@/shared/constants/game'

jest.mock('@/hooks/useGameMode')
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams()],
}))
jest.mock('@/data/questionBank', () => ({
  questionBank: {},
}))
jest.mock('@/modules/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false, configured: false, login: jest.fn(), register: jest.fn(), logout: jest.fn() }),
}))
jest.mock('@/modules/auth/hooks/useGameHistorySync', () => ({
  useGameHistorySync: () => undefined,
}))

const mockUseGameMode = useGameMode as jest.MockedFunction<typeof useGameMode>

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TriviaSessionProvider>{children}</TriviaSessionProvider>
)

describe('TriviaSessionProvider - unicidade de ids de tile', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUseGameMode.mockReturnValue({
      gameMode: 'online',
      demoConfig: DEFAULT_DEMO_SESSION_CONFIG,
      isDemo: false,
      isOffline: false,
      isOnline: true,
      getModeDisplayName: jest.fn(),
      getModeDescription: jest.fn(),
    } as unknown as ReturnType<typeof useGameMode>)
  })

  it('gera ids únicos ao adicionar muitos tiles num mesmo tick (regressão do import em massa)', () => {
    const { result } = renderHook(() => useTriviaSession(), { wrapper })

    // Simula o import em massa: uma coluna + N tiles num único `act` síncrono,
    // como faz onImportFilms. Antes do fix, todos compartilhavam o mesmo
    // `${columnId}-tile-${Date.now()}` e travavam o filme inteiro ao responder.
    act(() => {
      const columnId = result.current.addFilmColumn('Filme Importado')
      for (let i = 0; i < 12; i++) {
        result.current.addQuestionTile(columnId, { points: (i + 1) * 5, question: `Q${i}`, answer: `A${i}` })
      }
    })

    const tiles = result.current.session.board.flatMap((column) => column.tiles)
    const ids = tiles.map((tile) => tile.id)

    expect(tiles).toHaveLength(12)
    expect(new Set(ids).size).toBe(12) // todos únicos
  })
})
