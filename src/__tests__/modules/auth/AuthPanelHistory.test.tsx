/**
 * Testes da seção "Minhas partidas" no AuthPanel (quando logado).
 *
 * Cenários:
 *  1. Exibe estado de carregamento
 *  2. Exibe lista com 2 partidas (título, data, vencedor, placar)
 *  3. Exibe mensagem de vazio quando não há partidas
 *  4. Exibe erro discreto quando listGameHistory rejeita
 */

jest.mock('@/modules/auth/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

jest.mock('@/modules/auth/services/history.service', () => ({
  listGameHistory: jest.fn(),
  saveGameToHistory: jest.fn(),
}))

import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'
import { AuthPanel } from '@/modules/auth/components/AuthPanel'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { listGameHistory } from '@/modules/auth/services/history.service'
import type { GameHistoryEntry } from '@/modules/auth/services/history.service'

const mockUseAuth = useAuth as jest.Mock
const mockListGameHistory = listGameHistory as jest.Mock

const fakeUser = {
  id: 'user-1',
  email: 'a@b.com',
  user_metadata: { display_name: 'Raphael' },
}

const authLoggedIn = {
  user: fakeUser,
  loading: false,
  configured: true,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn().mockResolvedValue(undefined),
}

function makeEntry(overrides?: Partial<GameHistoryEntry>): GameHistoryEntry {
  return {
    id: `entry-${Math.random()}`,
    user_id: 'user-1',
    title: 'Jogo Teste',
    finished_at: '2026-06-10T12:00:00Z',
    created_at: '2026-06-10T12:00:00Z',
    summary: {
      scores: { 'Time A': 120, 'Time B': 90 },
      winner: 'Time A',
      teams: [
        { name: 'Time A', score: 120 },
        { name: 'Time B', score: 90 },
      ],
    },
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue(authLoggedIn)
})

describe('AuthPanel — seção Minhas partidas (logado)', () => {
  it('exibe "Carregando…" enquanto busca o histórico', async () => {
    // Promessa que nunca resolve durante este teste
    mockListGameHistory.mockReturnValue(new Promise(() => {}))

    render(<AuthPanel onClose={jest.fn()} />)

    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('lista 2 partidas com título, data, vencedor e placar', async () => {
    const entry1 = makeEntry({ id: 'e1', title: 'Copa Trivia 1' })
    const entry2 = makeEntry({
      id: 'e2',
      title: 'Copa Trivia 2',
      finished_at: '2026-06-11T15:00:00Z',
      summary: {
        scores: { 'Time X': 50, 'Time Y': 50 },
        winner: null,
        teams: [
          { name: 'Time X', score: 50 },
          { name: 'Time Y', score: 50 },
        ],
      },
    })

    mockListGameHistory.mockResolvedValue([entry1, entry2])

    await act(async () => {
      render(<AuthPanel onClose={jest.fn()} />)
    })

    // Títulos
    expect(screen.getByText('Copa Trivia 1')).toBeInTheDocument()
    expect(screen.getByText('Copa Trivia 2')).toBeInTheDocument()

    // Vencedor da partida 1
    expect(screen.getByText('Time A')).toBeInTheDocument()

    // Empate na partida 2
    expect(screen.getByText('Empate')).toBeInTheDocument()

    // Placar partida 1: "Time A 120 × Time B 90"
    expect(screen.getByText(/Time A 120 × Time B 90/i)).toBeInTheDocument()
  })

  it('exibe "Nenhuma partida registrada ainda" quando histórico está vazio', async () => {
    mockListGameHistory.mockResolvedValue([])

    await act(async () => {
      render(<AuthPanel onClose={jest.fn()} />)
    })

    expect(screen.getByText(/nenhuma partida registrada ainda/i)).toBeInTheDocument()
  })

  it('exibe mensagem de erro discreta quando listGameHistory rejeita', async () => {
    mockListGameHistory.mockRejectedValue(new Error('network error'))

    await act(async () => {
      render(<AuthPanel onClose={jest.fn()} />)
    })

    expect(screen.getByText(/não foi possível carregar o histórico/i)).toBeInTheDocument()
  })
})
