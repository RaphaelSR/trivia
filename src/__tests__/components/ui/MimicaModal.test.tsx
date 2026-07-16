import '@testing-library/jest-dom'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MimicaModal } from '@/components/ui/MimicaModal'
import type { TriviaTeam, TriviaParticipant } from '@/modules/trivia/types'

const mockTeams: TriviaTeam[] = [
  {
    id: 'team-1',
    name: 'Time 1',
    color: '#000',
    order: 0,
    members: ['participant-1', 'participant-2'],
    score: 0,
  },
  {
    id: 'team-2',
    name: 'Time 2',
    color: '#fff',
    order: 1,
    members: ['participant-3'],
    score: 0,
  },
]

const mockParticipants: TriviaParticipant[] = [
  {
    id: 'participant-1',
    name: 'Participante 1',
    role: 'player',
    teamId: 'team-1',
  },
  {
    id: 'participant-2',
    name: 'Participante 2',
    role: 'player',
    teamId: 'team-1',
  },
  {
    id: 'participant-3',
    name: 'Participante 3',
    role: 'player',
    teamId: 'team-2',
  },
]

describe('MimicaModal', () => {
  const mockOnClose = jest.fn()
  const mockOnScore = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  function selectScoringAndConfirm(label: RegExp) {
    const option = screen.getByText(label)
    fireEvent.click(option)

    const confirmButton = screen.getByText(/Confirmar e avançar/i)
    fireEvent.click(confirmButton)
  }

  it('não deve fechar automaticamente após último participante', async () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-3"
        triviaActiveTurnIndex={3}
        onScore={mockOnScore}
      />
    )

    selectScoringAndConfirm(/^100%$/)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalled()
    })

    act(() => jest.advanceTimersByTime(500))

    await waitFor(() => {
      expect(screen.getByTestId('mimica-active-participant')).toHaveTextContent('Participante 1')
    })

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('deve incrementar roundNumber quando retorna ao primeiro participante', async () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-3"
        triviaActiveTurnIndex={3}
        onScore={mockOnScore}
      />
    )

    selectScoringAndConfirm(/^100%$/)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalled()
    })

    act(() => jest.advanceTimersByTime(500))

    await waitFor(() => {
      expect(screen.getByText(/Rodada 2/i)).toBeInTheDocument()
    })
  })

  it('deve mostrar contador de turnos e rodadas', () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-1"
        triviaActiveTurnIndex={0}
        onScore={mockOnScore}
      />
    )

    expect(screen.getByText(/Rodada 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Turno 1/i)).toBeInTheDocument()
  })

  it('deve passar pontuação para activeParticipant', async () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-1"
        triviaActiveTurnIndex={0}
        onScore={mockOnScore}
      />
    )

    selectScoringAndConfirm(/^100%$/)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalledWith(
        'participant-1',
        'full-current',
        undefined,
        50,
        1,
        1
      )
    })
  })

  it('deve passar turnNumber e roundNumber corretos no onScore', async () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-1"
        triviaActiveTurnIndex={0}
        onScore={mockOnScore}
      />
    )

    selectScoringAndConfirm(/^100%$/)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalledWith(
        'participant-1',
        'full-current',
        undefined,
        50,
        expect.any(Number),
        1
      )
    })
  })

  it('deve testar modo full-current', async () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-1"
        triviaActiveTurnIndex={0}
        onScore={mockOnScore}
      />
    )

    selectScoringAndConfirm(/^100%$/)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalledWith(
        'participant-1',
        'full-current',
        undefined,
        50,
        1,
        1
      )
    })
  })

  it('deve testar modo half-current', async () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-1"
        triviaActiveTurnIndex={0}
        onScore={mockOnScore}
      />
    )

    selectScoringAndConfirm(/^50%$/)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalledWith(
        'participant-1',
        'half-current',
        undefined,
        25,
        1,
        1
      )
    })
  })

  it('deve testar modo steal', () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-1"
        triviaActiveTurnIndex={0}
        onScore={mockOnScore}
      />
    )

    // Click Roubo scoring option
    const stealOptions = screen.getAllByText(/Roubo/i)
    fireEvent.click(stealOptions[0])

    // Confirm button should be disabled until a team is selected
    const confirmButton = screen.getByText(/Confirmar e avançar/i)
    expect(confirmButton).toBeDisabled()
  })

  it('deve testar modo everyone', async () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-1"
        triviaActiveTurnIndex={0}
        onScore={mockOnScore}
      />
    )

    selectScoringAndConfirm(/^Todos$/)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalledWith(
        'participant-1',
        'everyone',
        undefined,
        25,
        1,
        1
      )
    })
  })

  it('deve testar modo void', async () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-1"
        triviaActiveTurnIndex={0}
        onScore={mockOnScore}
      />
    )

    selectScoringAndConfirm(/^Anular$/)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalledWith(
        'participant-1',
        'void',
        undefined,
        0,
        1,
        1
      )
    })
  })

  it('deve mostrar ordem de participação ao expandir', () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-1"
        triviaActiveTurnIndex={0}
        onScore={mockOnScore}
      />
    )

    const orderSummary = screen.getByText(/Ordem \(4\)/i)
    fireEvent.click(orderSummary)

    expect(screen.getAllByText('Alternada').length).toBeGreaterThan(0)
  })

  it('permite escolher claramente entre continuar do trivia e começar do primeiro', () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-3"
        triviaActiveTurnIndex={3}
        onScore={mockOnScore}
      />
    )

    expect(screen.getByTestId('mimica-active-participant')).toHaveTextContent('Participante 3')
    fireEvent.click(screen.getByRole('button', { name: 'Começar do primeiro' }))
    expect(screen.getByTestId('mimica-active-participant')).toHaveTextContent('Participante 1')
    fireEvent.click(screen.getByRole('button', { name: 'Continuar do trivia' }))
    expect(screen.getByTestId('mimica-active-participant')).toHaveTextContent('Participante 3')
  })

  it('não reinicia a ordem quando apenas a pontuação dos times muda', async () => {
    const { rerender } = render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-1"
        triviaActiveTurnIndex={0}
        onScore={mockOnScore}
      />
    )

    selectScoringAndConfirm(/^100%$/)
    act(() => jest.advanceTimersByTime(500))
    await waitFor(() => {
      expect(screen.getByTestId('mimica-active-participant')).toHaveTextContent('Participante 3')
    })

    rerender(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams.map(team => ({ ...team, score: team.score + 50 }))}
        participants={mockParticipants}
        triviaActiveParticipantId="participant-1"
        triviaActiveTurnIndex={0}
        onScore={mockOnScore}
      />
    )

    expect(screen.getByTestId('mimica-active-participant')).toHaveTextContent('Participante 3')
  })
})
