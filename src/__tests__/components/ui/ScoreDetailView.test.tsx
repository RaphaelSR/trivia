import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScoreDetailView } from '@/components/ui/ScoreDetailView'
import type { TriviaParticipant, TriviaTeam, TriviaColumn, MimicaScore } from '@/modules/trivia/types'

const mockParticipant: TriviaParticipant = {
  id: 'participant-1',
  name: 'Participante 1',
  role: 'player',
  teamId: 'team-1',
}

const mockTeam: TriviaTeam = {
  id: 'team-1',
  name: 'Time 1',
  color: '#000',
  order: 0,
  members: ['participant-1'],
  score: 100,
}

const mockBoard: TriviaColumn[] = [
  {
    id: 'col-1',
    filmId: 'film-1',
    film: 'Matrix',
    tiles: [
      {
        id: 'tile-1',
        film: 'Matrix',
        points: 10,
        question: 'Pergunta 1?',
        answer: 'Resposta 1',
        state: 'answered',
        answeredBy: {
          participantId: 'participant-1',
          teamId: 'team-1',
          pointsAwarded: 10,
          timestamp: new Date('2024-01-01T10:00:00').toISOString(),
          source: 'trivia',
          turnNumber: 1,
          roundNumber: 1,
        },
      },
      {
        id: 'tile-2',
        film: 'Matrix',
        points: 20,
        question: 'Pergunta 2?',
        answer: 'Resposta 2',
        state: 'answered',
        answeredBy: {
          participantId: 'participant-1',
          teamId: 'team-1',
          pointsAwarded: 20,
          timestamp: new Date('2024-01-01T10:05:00').toISOString(),
          source: 'trivia',
          turnNumber: 2,
          roundNumber: 1,
        },
      },
    ],
  },
]

const mockMimicaScores: MimicaScore[] = [
  {
    id: 'mimica-1',
    participantId: 'participant-1',
    teamId: 'team-1',
    pointsAwarded: 50,
    timestamp: new Date('2024-01-01T11:00:00').toISOString(),
    turnNumber: 1,
    roundNumber: 1,
    mode: 'full-current',
  },
  {
    id: 'mimica-2',
    participantId: 'participant-1',
    teamId: 'team-1',
    pointsAwarded: 25,
    timestamp: new Date('2024-01-01T11:05:00').toISOString(),
    turnNumber: 2,
    roundNumber: 1,
    mode: 'half-current',
  },
]

const mockAllParticipants: TriviaParticipant[] = [mockParticipant]
const mockAllTeams: TriviaTeam[] = [mockTeam]

describe('ScoreDetailView', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deve renderizar detalhes do participante', () => {
    render(
      <ScoreDetailView
        isOpen={true}
        onClose={mockOnClose}
        participant={mockParticipant}
        team={mockTeam}
        board={mockBoard}
        mimicaScores={mockMimicaScores}
        allParticipants={mockAllParticipants}
        allTeams={mockAllTeams}
      />
    )

    expect(screen.getByText(/Detalhes de Participante 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Time 1 · 105 pontos totais/i)).toBeInTheDocument()
  })

  it('deve mostrar resumo com breakdown por origem', () => {
    render(
      <ScoreDetailView
        isOpen={true}
        onClose={mockOnClose}
        participant={mockParticipant}
        team={mockTeam}
        board={mockBoard}
        mimicaScores={mockMimicaScores}
        allParticipants={mockAllParticipants}
        allTeams={mockAllTeams}
      />
    )

    expect(screen.getByText(/Total de Pontos/i)).toBeInTheDocument()
    expect(screen.getByText(/30 pts/i)).toBeInTheDocument()
    expect(screen.getByText(/75 pts/i)).toBeInTheDocument()
    expect(screen.getByText(/Perguntas do Trivia/i)).toBeInTheDocument()
    const mimicaElements = screen.getAllByText(/Mímicas/i)
    expect(mimicaElements.length).toBeGreaterThan(0)
  })

  it('deve mostrar aba de Trivia com perguntas respondidas', () => {
    render(
      <ScoreDetailView
        isOpen={true}
        onClose={mockOnClose}
        participant={mockParticipant}
        team={mockTeam}
        board={mockBoard}
        mimicaScores={mockMimicaScores}
        allParticipants={mockAllParticipants}
        allTeams={mockAllTeams}
      />
    )

    const triviaTab = screen.getByText(/Trivia \(2\)/i)
    fireEvent.click(triviaTab)

    expect(screen.getByText(/Pergunta 1\?/i)).toBeInTheDocument()
    expect(screen.getByText(/Pergunta 2\?/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Matrix/i).length).toBeGreaterThan(0)
  })

  it('deve mostrar aba de Mimica com mímicas acertadas', () => {
    render(
      <ScoreDetailView
        isOpen={true}
        onClose={mockOnClose}
        participant={mockParticipant}
        team={mockTeam}
        board={mockBoard}
        mimicaScores={mockMimicaScores}
        allParticipants={mockAllParticipants}
        allTeams={mockAllTeams}
      />
    )

    const mimicaTab = screen.getByText(/Mímica \(2\)/i)
    fireEvent.click(mimicaTab)

    expect(screen.getByText(/Volta 1 · Turno 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Volta 1 · Turno 2/i)).toBeInTheDocument()
    expect(screen.getByText(/50 pts/i)).toBeInTheDocument()
    expect(screen.getByText(/25 pts/i)).toBeInTheDocument()
  })

  it('deve mostrar perguntas na aba de Trivia', () => {
    render(
      <ScoreDetailView
        isOpen={true}
        onClose={mockOnClose}
        participant={mockParticipant}
        team={mockTeam}
        board={mockBoard}
        mimicaScores={mockMimicaScores}
        allParticipants={mockAllParticipants}
        allTeams={mockAllTeams}
      />
    )

    const triviaTab = screen.getByText(/Trivia \(2\)/i)
    fireEvent.click(triviaTab)

    expect(screen.getByText(/Pergunta 1\?/i)).toBeInTheDocument()
    expect(screen.getByText(/Pergunta 2\?/i)).toBeInTheDocument()
  })

  it('deve calcular totais corretamente (trivia vs mimica)', () => {
    render(
      <ScoreDetailView
        isOpen={true}
        onClose={mockOnClose}
        participant={mockParticipant}
        team={mockTeam}
        board={mockBoard}
        mimicaScores={mockMimicaScores}
        allParticipants={mockAllParticipants}
        allTeams={mockAllTeams}
      />
    )

    expect(screen.getByText(/Perguntas do Trivia/i)).toBeInTheDocument()
    expect(screen.getByText(/Total de Pontos/i)).toBeInTheDocument()
    const mimicaElements = screen.getAllByText(/Mímicas/i)
    expect(mimicaElements.length).toBeGreaterThan(0)
  })

  it('deve mostrar estatísticas corretas', () => {
    render(
      <ScoreDetailView
        isOpen={true}
        onClose={mockOnClose}
        participant={mockParticipant}
        team={mockTeam}
        board={mockBoard}
        mimicaScores={mockMimicaScores}
        allParticipants={mockAllParticipants}
        allTeams={mockAllTeams}
      />
    )

    expect(screen.getByText(/Trivia \(2\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Mímica \(2\)/i)).toBeInTheDocument()
  })

  it('deve mostrar mensagem quando não há perguntas respondidas', () => {
    const emptyBoard: TriviaColumn[] = []

    render(
      <ScoreDetailView
        isOpen={true}
        onClose={mockOnClose}
        participant={mockParticipant}
        team={mockTeam}
        board={emptyBoard}
        mimicaScores={[]}
        allParticipants={mockAllParticipants}
        allTeams={mockAllTeams}
      />
    )

    const triviaTab = screen.getByText(/Trivia \(0\)/i)
    fireEvent.click(triviaTab)

    expect(screen.getByText(/Nenhuma pergunta respondida ainda/i)).toBeInTheDocument()
  })

  it('deve mostrar mensagem quando não há mímicas acertadas', () => {
    render(
      <ScoreDetailView
        isOpen={true}
        onClose={mockOnClose}
        participant={mockParticipant}
        team={mockTeam}
        board={mockBoard}
        mimicaScores={[]}
        allParticipants={mockAllParticipants}
        allTeams={mockAllTeams}
      />
    )

    const mimicaTab = screen.getByText(/Mímica \(0\)/i)
    fireEvent.click(mimicaTab)

    expect(screen.getByText(/Nenhuma mímica acertada ainda/i)).toBeInTheDocument()
  })

  it('deve mostrar targetTeam no modo steal', () => {
    const stealMimicaScores: MimicaScore[] = [
      {
        id: 'mimica-steal',
        participantId: 'participant-1',
        teamId: 'team-2',
        pointsAwarded: 50,
        timestamp: new Date('2024-01-01T11:00:00').toISOString(),
        turnNumber: 1,
        roundNumber: 1,
        mode: 'steal',
        targetTeamId: 'team-2',
      },
    ]

    const mockTeam2: TriviaTeam = {
      id: 'team-2',
      name: 'Time 2',
      color: '#fff',
      order: 1,
      members: [],
      score: 0,
    }

    render(
      <ScoreDetailView
        isOpen={true}
        onClose={mockOnClose}
        participant={mockParticipant}
        team={mockTeam}
        board={[]}
        mimicaScores={stealMimicaScores}
        allParticipants={mockAllParticipants}
        allTeams={[...mockAllTeams, mockTeam2]}
      />
    )

    const mimicaTab = screen.getByText(/Mímica \(1\)/i)
    fireEvent.click(mimicaTab)

    expect(screen.getByText(/→ Time 2/i)).toBeInTheDocument()
  })
})

