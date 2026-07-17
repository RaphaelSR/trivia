/**
 * Testes para GameDetailView + InviteShare integrado
 *
 * Cenários:
 *  1. Estado de loading
 *  2. Estado de erro
 *  3. Render ok com ranking, badge "vinculado", badge "importado"
 *  4. Botão Voltar chama onBack
 *  5. InviteShare: participante não-vinculado com token mostra botões de convite
 *  6. InviteShare: participante vinculado mostra selo "vinculado" e não tem botões de convite
 *  7. InviteShare: copiar link chama clipboard e exibe feedback "Copiado ✓"
 */

jest.mock('@/modules/auth/services/normalized-history.service', () => ({
  getGameDetail: jest.fn(),
  getNormalizedGameSnapshot: jest.fn(),
  buildClaimUrl: jest.fn((token: string) => `https://example.com/claim?token=${token}`),
  buildSessionClaimUrl: jest.fn(
    (joinToken: string) => `https://example.com/claim?game=${joinToken}`,
  ),
}))

jest.mock('@/modules/auth/services/profile-avatar.service', () => ({
  listGameParticipantIdentities: jest.fn().mockResolvedValue([]),
}))

import '@testing-library/jest-dom'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { GameDetailView } from '@/modules/auth/components/GameDetailView'
import { getGameDetail } from '@/modules/auth/services/normalized-history.service'
import { getNormalizedGameSnapshot } from '@/modules/auth/services/normalized-history.service'
import type { GameDetail } from '@/modules/auth/services/normalized-history.service'
import { listGameParticipantIdentities } from '@/modules/auth/services/profile-avatar.service'

const mockGetGameDetail = getGameDetail as jest.Mock
const mockGetSnapshot = getNormalizedGameSnapshot as jest.Mock
const mockListIdentities = listGameParticipantIdentities as jest.Mock

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const JOIN_TOKEN = 'join-uuid-0000-0000-0000-000000000000'

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
    joinToken: null,
    isOwner: false,
    teams: [
      { id: 'team-a', client_id: 'ca', name: 'Time A', color: '#f00', final_score: 100 },
      { id: 'team-b', client_id: 'cb', name: 'Time B', color: '#00f', final_score: 80 },
    ],
    participants: [
      { id: 'p1', client_id: 'c1', display_name: 'Alice', team_id: 'team-a', profile_id: 'profile-uuid', claim_token: null },
      { id: 'p2', client_id: 'c2', display_name: 'Bob', team_id: 'team-b', profile_id: null, claim_token: 'token-bob-uuid' },
    ],
    films: [
      { id: 'film-1', client_id: 'f1', name: 'Filme 1', order: 0 },
    ],
    questions: [
      { id: 'q1', client_id: 'q1c', film_id: 'film-1', points: 10, question: 'P1?', answer: 'R1', state: 'answered' },
    ],
    ranking: [
      { participant_id: 'p1', participant_client_id: 'c1', display_name: 'Alice', team_id: 'team-a', team_name: 'Time A', profile_id: 'profile-uuid', claim_token: null, trivia_points: 30, mimica_points: 0, total_points: 30 },
      { participant_id: 'p2', participant_client_id: 'c2', display_name: 'Bob', team_id: 'team-b', team_name: 'Time B', profile_id: null, claim_token: 'token-bob-uuid', trivia_points: 0, mimica_points: 20, total_points: 20 },
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

const finishedSnapshot = {
  id: 'session-original',
  title: 'Copa Trivia',
  scheduledAt: '2026-06-12T09:00:00.000Z',
  theme: {
    id: 'dark',
    name: 'Escuro',
    palette: { background: '#000', primary: '#fff', secondary: '#aaa', accent: '#bbb', surface: '#111' },
  },
  teams: [{ id: 'team-a', name: 'Time A', color: '#f00', order: 0, members: ['p1'], score: 100 }],
  participants: [{ id: 'p1', name: 'Alice', role: 'player' as const, teamId: 'team-a' }],
  board: [{
    id: 'film-1',
    filmId: 'film-1',
    film: 'Filme 1',
    tiles: [{ id: 'q1', film: 'Filme 1', points: 100, state: 'answered' as const, question: 'P?', answer: 'R' }],
  }],
  activeTeamId: 'team-a',
  activeParticipantId: 'p1',
  activeTurnIndex: 0,
  turnSequence: ['p1'],
  mimicaScores: [],
  eventLog: [],
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
    mockListIdentities.mockResolvedValue([])
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

  it('exibe avatar escopado do participante no historico', async () => {
    mockGetGameDetail.mockResolvedValue(makeDetail())
    mockListIdentities.mockResolvedValue([
      {
        participantClientId: 'c1',
        profileId: 'profile-uuid',
        accountDisplayName: 'Alice conta',
        avatarUrl: 'https://cdn.test/alice.webp',
      },
    ])
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })
    expect(screen.getByRole('img', { name: 'Avatar de Alice' })).toHaveAttribute(
      'src',
      'https://cdn.test/alice.webp',
    )
    expect(mockListIdentities).toHaveBeenCalledWith('game-1')
  })

  it('exibe badge "vinculado" para participante com profile_id', async () => {
    mockGetGameDetail.mockResolvedValue(makeDetail())
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })
    // "vinculado" pode aparecer mais de uma vez (ranking + seção de convites)
    expect(screen.getAllByText('vinculado').length).toBeGreaterThan(0)
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

  it('protege o histórico e abre uma nova sessão somente após escolher como continuar', async () => {
    const onOpenCopy = jest.fn().mockResolvedValue(true)
    mockGetGameDetail.mockResolvedValue(makeDetail())
    mockGetSnapshot.mockResolvedValue(finishedSnapshot)
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} onOpenCopy={onOpenCopy} />)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Abrir uma cópia' }))
    expect(await screen.findByRole('heading', { name: 'Como você quer abrir esta partida?' })).toBeInTheDocument()
    expect(screen.getByText(/original permanecem intactos/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /continuar de onde parou/i }))
    await waitFor(() => expect(onOpenCopy).toHaveBeenCalledTimes(1))
    expect(onOpenCopy.mock.calls[0][0]).toMatchObject({
      title: 'Copa Trivia — cópia',
      board: [{ tiles: [{ state: 'answered' }] }],
    })
    expect(onOpenCopy.mock.calls[0][0].id).not.toBe('session-original')
  })

  it('mostra erro sem alterar nada quando o snapshot integral não está disponível', async () => {
    mockGetGameDetail.mockResolvedValue(makeDetail())
    mockGetSnapshot.mockResolvedValue(null)
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} onOpenCopy={jest.fn()} />)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Abrir uma cópia' }))
    expect(await screen.findByText(/não foi possível preparar uma cópia/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// InviteShare — integrado no GameDetailView
// ---------------------------------------------------------------------------

describe('GameDetailView — InviteShare (convites)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exibe botões de convite para participante não-vinculado com claim_token', async () => {
    mockGetGameDetail.mockResolvedValue(makeDetail())
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })

    // Bob é não-vinculado e tem claim_token — deve mostrar botões
    expect(screen.getByLabelText(/convidar bob/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/copiar link de convite para bob/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/compartilhar convite de bob pelo whatsapp/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/compartilhar convite de bob por e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mostrar qr code para bob/i)).toBeInTheDocument()
  })

  it('WhatsApp href contém a URL correta', async () => {
    mockGetGameDetail.mockResolvedValue(makeDetail())
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })

    const waLink = screen.getByLabelText(/compartilhar convite de bob pelo whatsapp/i)
    const href = waLink.getAttribute('href') ?? ''
    expect(href).toContain('wa.me')
    expect(href).toContain('token-bob-uuid')
  })

  it('E-mail href contém mailto e a URL correta', async () => {
    mockGetGameDetail.mockResolvedValue(makeDetail())
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })

    const mailLink = screen.getByLabelText(/compartilhar convite de bob por e-mail/i)
    const href = mailLink.getAttribute('href') ?? ''
    expect(href).toContain('mailto:')
    expect(href).toContain('token-bob-uuid')
  })

  it('participante vinculado (Alice) não mostra botões de convite', async () => {
    mockGetGameDetail.mockResolvedValue(makeDetail())
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })

    // Alice está vinculada — não deve ter botão "Convidar Alice"
    expect(screen.queryByLabelText(/convidar alice/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/copiar link de convite para alice/i)).not.toBeInTheDocument()
  })

  it('copiar link chama navigator.clipboard e exibe feedback "Copiado"', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    mockGetGameDetail.mockResolvedValue(makeDetail())
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })

    const copyBtn = screen.getByLabelText(/copiar link de convite para bob/i)
    await act(async () => {
      fireEvent.click(copyBtn)
    })

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('token-bob-uuid'),
    )

    await waitFor(() => {
      expect(screen.getByText(/copiado/i)).toBeInTheDocument()
    })
  })

  it('participante sem token não mostra bloco de convite', async () => {
    // Simula leitura por não-dono: todos com claim_token null
    mockGetGameDetail.mockResolvedValue(
      makeDetail({
        participants: [
          { id: 'p1', client_id: 'c1', display_name: 'Alice', team_id: 'team-a', profile_id: 'profile-uuid', claim_token: null },
          { id: 'p2', client_id: 'c2', display_name: 'Bob', team_id: 'team-b', profile_id: null, claim_token: null },
        ],
      }),
    )
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })

    // Seção de convites não deve aparecer
    expect(screen.queryByText(/convidar participantes/i)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Convite da sessão (isOwner + joinToken)
// ---------------------------------------------------------------------------

describe('GameDetailView — Convite da sessão', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exibe bloco "Convite da sessão" quando isOwner=true e joinToken presente', async () => {
    mockGetGameDetail.mockResolvedValue(
      makeDetail({ isOwner: true, joinToken: JOIN_TOKEN }),
    )
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })
    // O section tem aria-label="Convite da sessão"
    expect(screen.getByRole('region', { name: /convite da partida/i })).toBeInTheDocument()
    expect(screen.getByText(/compartilhe um único link com todos/i)).toBeInTheDocument()
  })

  it('NÃO exibe bloco "Convite da sessão" quando isOwner=false', async () => {
    mockGetGameDetail.mockResolvedValue(
      makeDetail({ isOwner: false, joinToken: JOIN_TOKEN }),
    )
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })
    expect(screen.queryByRole('region', { name: /convite da partida/i })).not.toBeInTheDocument()
  })

  it('NÃO exibe bloco "Convite da sessão" quando joinToken=null mesmo com isOwner=true', async () => {
    mockGetGameDetail.mockResolvedValue(
      makeDetail({ isOwner: true, joinToken: null }),
    )
    await act(async () => {
      render(<GameDetailView gameId="game-1" onBack={jest.fn()} />)
    })
    expect(screen.queryByRole('region', { name: /convite da partida/i })).not.toBeInTheDocument()
  })
})
