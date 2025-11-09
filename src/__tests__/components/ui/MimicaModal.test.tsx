import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

const mockTurnSequence = ['participant-1', 'participant-3', 'participant-2']

describe('MimicaModal', () => {
  const mockOnClose = jest.fn()
  const mockOnAdvanceTurn = jest.fn()
  const mockOnScore = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('não deve fechar automaticamente após último participante', async () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        activeParticipant={mockParticipants[2]}
        turnSequence={mockTurnSequence}
        onAdvanceTurn={mockOnAdvanceTurn}
        onScore={mockOnScore}
      />
    )

    const configSummary = screen.getByText(/Configuração da mímica/i)
    fireEvent.click(configSummary)

    const distributionSummary = screen.getByText(/Distribuição de pontos/i)
    fireEvent.click(distributionSummary)

    const fullValueOption = screen.getByText(/Valor cheio/i)
    fireEvent.click(fullValueOption)

    const scoringButton = screen.getByText(/Confirmar pontuação e avançar/i)
    fireEvent.click(scoringButton)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalled()
    })

    jest.advanceTimersByTime(500)

    await waitFor(() => {
      expect(mockOnAdvanceTurn).toHaveBeenCalled()
    })

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('deve incrementar roundNumber quando volta ao primeiro participante', async () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        activeParticipant={mockParticipants[2]}
        turnSequence={mockTurnSequence}
        onAdvanceTurn={mockOnAdvanceTurn}
        onScore={mockOnScore}
      />
    )

    const distributionSummary = screen.getByText(/Distribuição de pontos/i)
    fireEvent.click(distributionSummary)

    const fullValueOption = screen.getByText(/Valor cheio/i)
    fireEvent.click(fullValueOption)

    const confirmButton = screen.getByText(/Confirmar pontuação e avançar/i)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalled()
    })

    jest.advanceTimersByTime(500)

    await waitFor(() => {
      expect(mockOnAdvanceTurn).toHaveBeenCalled()
    })
  })

  it('deve mostrar contador de turnos e voltas', () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        activeParticipant={mockParticipants[0]}
        turnSequence={mockTurnSequence}
        onAdvanceTurn={mockOnAdvanceTurn}
        onScore={mockOnScore}
      />
    )

    expect(screen.getByText(/Volta 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Turno 1/i)).toBeInTheDocument()
  })

  it('deve passar pontuação para activeParticipant', async () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        activeParticipant={mockParticipants[0]}
        turnSequence={mockTurnSequence}
        onAdvanceTurn={mockOnAdvanceTurn}
        onScore={mockOnScore}
      />
    )

    const distributionSummary = screen.getByText(/Distribuição de pontos/i)
    fireEvent.click(distributionSummary)

    const fullValueOption = screen.getByText(/Valor cheio/i)
    fireEvent.click(fullValueOption)

    const confirmButton = screen.getByText(/Confirmar pontuação e avançar/i)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalledWith(
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
        activeParticipant={mockParticipants[0]}
        turnSequence={mockTurnSequence}
        onAdvanceTurn={mockOnAdvanceTurn}
        onScore={mockOnScore}
      />
    )

    const distributionSummary = screen.getByText(/Distribuição de pontos/i)
    fireEvent.click(distributionSummary)

    const fullValueOption = screen.getByText(/Valor cheio/i)
    fireEvent.click(fullValueOption)

    const confirmButton = screen.getByText(/Confirmar pontuação e avançar/i)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalledWith(
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
        activeParticipant={mockParticipants[0]}
        turnSequence={mockTurnSequence}
        onAdvanceTurn={mockOnAdvanceTurn}
        onScore={mockOnScore}
      />
    )

    const distributionSummary = screen.getByText(/Distribuição de pontos/i)
    fireEvent.click(distributionSummary)

    const fullValueOption = screen.getByText(/Valor cheio/i)
    fireEvent.click(fullValueOption)

    const confirmButton = screen.getByText(/Confirmar pontuação e avançar/i)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalledWith(
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
        activeParticipant={mockParticipants[0]}
        turnSequence={mockTurnSequence}
        onAdvanceTurn={mockOnAdvanceTurn}
        onScore={mockOnScore}
      />
    )

    const distributionSummary = screen.getByText(/Distribuição de pontos/i)
    fireEvent.click(distributionSummary)

    const halfValueOption = screen.getByText(/Meio valor/i)
    fireEvent.click(halfValueOption)

    const confirmButton = screen.getByText(/Confirmar pontuação e avançar/i)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalledWith(
        'half-current',
        undefined,
        25,
        1,
        1
      )
    })
  })

  it('deve testar modo steal', async () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        activeParticipant={mockParticipants[0]}
        turnSequence={mockTurnSequence}
        onAdvanceTurn={mockOnAdvanceTurn}
        onScore={mockOnScore}
      />
    )

    const distributionSummary = screen.getByText(/Distribuição de pontos/i)
    fireEvent.click(distributionSummary)

    const stealOption = screen.getByText(/Roubo/i)
    fireEvent.click(stealOption)

    const teamSelect = screen.getByRole('combobox')
    fireEvent.change(teamSelect, { target: { value: 'team-2' } })

    const confirmButton = screen.getByText(/Confirmar pontuação e avançar/i)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalledWith(
        'steal',
        'team-2',
        50,
        1,
        1
      )
    })
  })

  it('deve testar modo everyone', async () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        activeParticipant={mockParticipants[0]}
        turnSequence={mockTurnSequence}
        onAdvanceTurn={mockOnAdvanceTurn}
        onScore={mockOnScore}
      />
    )

    const distributionSummary = screen.getByText(/Distribuição de pontos/i)
    fireEvent.click(distributionSummary)

    const everyoneOption = screen.getByText(/Todos/i)
    fireEvent.click(everyoneOption)

    const confirmButton = screen.getByText(/Confirmar pontuação e avançar/i)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalledWith(
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
        activeParticipant={mockParticipants[0]}
        turnSequence={mockTurnSequence}
        onAdvanceTurn={mockOnAdvanceTurn}
        onScore={mockOnScore}
      />
    )

    const distributionSummary = screen.getByText(/Distribuição de pontos/i)
    fireEvent.click(distributionSummary)

    const voidOption = screen.getByText(/Anular/i)
    fireEvent.click(voidOption)

    const confirmButton = screen.getByText(/Confirmar pontuação e avançar/i)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnScore).toHaveBeenCalledWith(
        'void',
        undefined,
        0,
        1,
        1
      )
    })
  })

  it('deve mostrar tooltips nos modos de participação', () => {
    render(
      <MimicaModal
        isOpen={true}
        onClose={mockOnClose}
        teams={mockTeams}
        participants={mockParticipants}
        activeParticipant={mockParticipants[0]}
        turnSequence={mockTurnSequence}
        onAdvanceTurn={mockOnAdvanceTurn}
        onScore={mockOnScore}
      />
    )

    const configSummary = screen.getByText(/Configuração da mímica/i)
    fireEvent.click(configSummary)

    expect(screen.getAllByText(/Ordem de participação/i).length).toBeGreaterThan(0)
  })
})

