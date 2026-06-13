/**
 * Testes para GameDetailView
 *
 * Cenários:
 *  1. Estado de loading
 *  2. Estado de erro
 *  3. Render ok com ranking, badge "vinculado", badge "importado"
 *  4. Botão Voltar chama onBack
 */

jest.mock('@/modules/auth/services/normalized-history.service', () => ({
  getGameDetail: jest.fn(),
}))

import '@testing-library/jest-dom'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { GameDetailView } from '@/modules/auth/components/GameDetailView'
import { getGameDetail } from '@/modules/auth/services/normalized-history.service'
import type { GameDetail } from '@/modules/auth/services/normalized-history.service'

const mockGetGameDetail = getGameDetail as jest.Mock

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDetail(overrides?: Partial<GameDetail>): GameDetail {
  return {
    id: 'game-1',
    title: 'Copa Trivia',
    played_at: '2026-06-12T09:00:00.000Z',
    started_at: '2026-06-12T10:00:00.000Z',
    ended_at: '2026-06-12T12:00:00.000Z',
    source: 'live',
    winner_team_id: 'team-a',
    winner_team_name: 'Time A',
    teams: [
      { id: 'team-a', client_id: 'ca', name: 'Time A', color: '#f00', final_score: 100 },
      { id: 'team-b', client_id: 'cb', name: 'Time B', color: '#00f', final_score: 80 },
    ],
    participants: [
      { id: 'p1', client_id: 'c1', display_name: 'Alice', team_id: 'team-a', profile_id: 'profile-uuid' },
      { id: 'p2', client_id: 'c2', display_name: 'Bob', team_id: 'team-b', profile_id: null },
    ],
    films: [
      { id: 'film-1', client_id: 'f1', name: 'Filme 1', order: 0 },
    ],
    questions: [
      { id: 'q1', client_id: 'q1c', film_id: 'film-1', points: 10, question: 'P1?', answer: 'R1', state: 'answered' },
    ],
    ranking: [
      { participant_id: 'p1', display_name: 'Alice', team_id: 'team-a', team_name: 'Time A', profile_id: 'profile-uuid', trivia_points: 30, mimica_points: 0, total_points: 30 },
      { participant_id: 'p2', display_name: 'Bob', team_id: 'team-b', team_name: 'Time B', profile_id: null, trivia_points: 0, mimica_points: 20, total_points: 20 },
    ],
    timeline: [
      {
        event_id: 'evt-1',
        type: 'trivia',
        occurred_at: '2026-06-12T10:00:00.000Z',
        actor_participant_id: 'p1',
        actor_name: 'Alice',
        team_id: 'team-a',
        team_name: 'Time A',
        points: 10,
        question_id: 'q1',
        question_text: 'P1?',
        voided: false,
      },
    ],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GameDetailView — loading', () => {
  it('exibe texto de carregamento enquanto busca', () => {
    mockGetGameDetail.mockReturnValue(new Promise(() => {}))
    render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    // Tanto o header quanto o conteúdo mostram "Carregando" enquanto carrega
    expect(screen.getAllByText(/carregando/i).length).toBeGreaterThan(0)
  })
})

describe('GameDetailView — erro', () => {
  it('exibe mensagem de erro quando getGameDetail retorna null', async () => {
    mockGetGameDetail.mockResolvedValue(null)
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })
    expect(screen.getByText(/não foi possível carregar os detalhes/i)).toBeInTheDocument()
  })

  it('exibe mensagem de erro quando getGameDetail rejeita', async () => {
    mockGetGameDetail.mockRejectedValue(new Error('network'))
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })
    expect(screen.getByText(/não foi possível carregar os detalhes/i)).toBeInTheDocument()
  })
})

describe('GameDetailView — render ok', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exibe título, vencedor e times no placar', async () => {
    mockGetGameDetail.mockResolvedValue(makeDetail())
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })

    // Título na barra de header
    expect(screen.getByText('Copa Trivia')).toBeInTheDocument()
    // Vencedor
    expect(screen.getByText(/vencedor: time a/i)).toBeInTheDocument()
    // Placar
    expect(screen.getAllByText('Time A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Time B').length).toBeGreaterThan(0)
  })

  it('exibe ranking com participantes e pontos', async () => {
    mockGetGameDetail.mockResolvedValue(makeDetail())
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })

    // Alice aparece no ranking e na timeline — usa getAllByText
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0)
    expect(screen.getByText(/30 pts/i)).toBeInTheDocument()
  })

  it('exibe badge "vinculado" para participante com profile_id', async () => {
    mockGetGameDetail.mockResolvedValue(makeDetail())
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })
    expect(screen.getByText('vinculado')).toBeInTheDocument()
  })

  it('exibe badge "importado" quando source === "import"', async () => {
    mockGetGameDetail.mockResolvedValue(makeDetail({ source: 'import' }))
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })
    expect(screen.getByText('importado')).toBeInTheDocument()
  })

  it('botão Voltar chama onBack', async () => {
    const onBack = jest.fn()
    mockGetGameDetail.mockResolvedValue(makeDetail())
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={onBack} />)
    })
    fireEvent.click(screen.getByLabelText(/voltar/i))
    expect(onBack).toHaveBeenCalled()
  })
})
