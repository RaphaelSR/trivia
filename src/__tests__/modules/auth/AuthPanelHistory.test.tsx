/**
 * Testes da seção "Minhas partidas" no AuthPanel (quando logado).
 *
 * Cenários:
 *  1. Exibe estado de carregamento
 *  2. Exibe lista com 2 partidas (título, data, vencedor, placar)
 *  3. Exibe mensagem de vazio quando não há partidas
 *  4. Exibe erro discreto quando listNormalizedGames rejeita
 *  5. Exibe badge 'importado' quando source === 'import'
 */

jest.mock('@/modules/auth/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

jest.mock('@/modules/auth/services/normalized-history.service', () => ({
  listNormalizedGames: jest.fn(),
  saveNormalizedGame: jest.fn(),
  getGameDetail: jest.fn().mockReturnValue(new Promise(() => {})),
}))

jest.mock('@/modules/auth/components/GameDetailView', () => ({
  GameDetailView: ({ onBack }: { onBack: () => void }) => (
    <div>
      <button onClick={onBack}>Voltar</button>
      <span>GameDetailView</span>
    </div>
  ),
}))

import '@testing-library/jest-dom'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { AuthPanel } from '@/modules/auth/components/AuthPanel'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { listNormalizedGames } from '@/modules/auth/services/normalized-history.service'
import type { NormalizedGameSummary } from '@/modules/auth/services/normalized-history.service'

const mockUseAuth = useAuth as jest.Mock
const mockListNormalizedGames = listNormalizedGames as jest.Mock

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

function makeEntry(overrides?: Partial<NormalizedGameSummary>): NormalizedGameSummary {
  return {
    id: `entry-${Math.random()}`,
    title: 'Jogo Teste',
    playedAt: '2026-06-10T12:00:00Z',
    endedAt: '2026-06-10T13:00:00Z',
    winner: 'Time A',
    source: 'live',
    teams: [
      { name: 'Time A', score: 120 },
      { name: 'Time B', score: 90 },
    ],
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
    mockListNormalizedGames.mockReturnValue(new Promise(() => {}))

    render(<AuthPanel onClose={jest.fn()} />)

    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('lista 2 partidas com título, data, vencedor e placar', async () => {
    const entry1 = makeEntry({ id: 'e1', title: 'Copa Trivia 1' })
    const entry2 = makeEntry({
      id: 'e2',
      title: 'Copa Trivia 2',
      playedAt: '2026-06-11T15:00:00Z',
      winner: null,
      teams: [
        { name: 'Time X', score: 50 },
        { name: 'Time Y', score: 50 },
      ],
    })

    mockListNormalizedGames.mockResolvedValue([entry1, entry2])

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

    // Placar partida 1
    expect(screen.getByText(/Time A 120 × Time B 90/i)).toBeInTheDocument()
  })

  it('exibe "Nenhuma partida registrada ainda" quando histórico está vazio', async () => {
    mockListNormalizedGames.mockResolvedValue([])

    await act(async () => {
      render(<AuthPanel onClose={jest.fn()} />)
    })

    expect(screen.getByText(/nenhuma partida registrada ainda/i)).toBeInTheDocument()
  })

  it('exibe mensagem de erro discreta quando listNormalizedGames rejeita', async () => {
    mockListNormalizedGames.mockRejectedValue(new Error('network error'))

    await act(async () => {
      render(<AuthPanel onClose={jest.fn()} />)
    })

    expect(screen.getByText(/não foi possível carregar o histórico/i)).toBeInTheDocument()
  })

  it('exibe badge "importado" quando source === "import"', async () => {
    const importedEntry = makeEntry({ id: 'e-import', source: 'import', title: 'Jogo Importado' })
    mockListNormalizedGames.mockResolvedValue([importedEntry])

    await act(async () => {
      render(<AuthPanel onClose={jest.fn()} />)
    })

    expect(screen.getByText('importado')).toBeInTheDocument()
  })

  it('clicar numa partida abre o GameDetailView', async () => {
    const entry = makeEntry({ id: 'e1', title: 'Copa Trivia 1' })
    mockListNormalizedGames.mockResolvedValue([entry])

    await act(async () => {
      render(<AuthPanel onClose={jest.fn()} />)
    })

    // Clica no botão de detalhes da partida
    const btn = screen.getByRole('button', { name: /ver detalhes de copa trivia 1/i })
    fireEvent.click(btn)

    // GameDetailView é renderizado (mock)
    expect(screen.getByText('GameDetailView')).toBeInTheDocument()
    // A lista não aparece mais
    expect(screen.queryByText('Copa Trivia 1')).not.toBeInTheDocument()
  })

  it('botão Voltar no GameDetailView retorna à lista', async () => {
    const entry = makeEntry({ id: 'e1', title: 'Copa Trivia 1' })
    mockListNormalizedGames.mockResolvedValue([entry])

    await act(async () => {
      render(<AuthPanel onClose={jest.fn()} />)
    })

    // Abre o detalhe
    fireEvent.click(screen.getByRole('button', { name: /ver detalhes de copa trivia 1/i }))
    expect(screen.getByText('GameDetailView')).toBeInTheDocument()

    // Clica em voltar
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))

    // Lista deve reaparecer
    expect(screen.getByText('Copa Trivia 1')).toBeInTheDocument()
    expect(screen.queryByText('GameDetailView')).not.toBeInTheDocument()
  })
})
