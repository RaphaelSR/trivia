import '@testing-library/jest-dom'
import { renderHook, act } from '@testing-library/react'
import { TriviaSessionProvider } from '@/modules/trivia/providers/TriviaSessionProvider'
import { useTriviaSession } from '@/modules/trivia/hooks/useTriviaSession'
import { useGameMode } from '@/hooks/useGameMode'

jest.mock('@/hooks/useGameMode')
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams()],
}))
jest.mock('@/data/questionBank', () => ({
  questionBank: {},
}))

const mockUseGameMode = useGameMode as jest.MockedFunction<typeof useGameMode>

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TriviaSessionProvider>{children}</TriviaSessionProvider>
)

describe('ControlDashboard - Mimica Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUseGameMode.mockReturnValue({
      gameMode: 'demo',
      isDemo: true,
      isOffline: false,
      isOnline: false,
      getModeDisplayName: jest.fn((mode) => mode),
      getModeDescription: jest.fn((mode) => mode),
    })
  })

  it('deve integrar mimica com scoreboard corretamente', async () => {
    const { result } = renderHook(() => useTriviaSession(), { wrapper })

    await act(async () => {
      const teams = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          order: 0,
          members: ['participant-1'],
          score: 0,
        },
      ]
      const participants = [
        {
          id: 'participant-1',
          name: 'Participante 1',
          role: 'player' as const,
          teamId: 'team-1',
        },
      ]
      result.current.updateTeamsAndParticipants(teams, participants)
    })

    await act(async () => {
      result.current.awardMimicaPoints(
        'participant-1',
        'team-1',
        50,
        1,
        1,
        'full-current'
      )
    })

    expect(result.current.session.mimicaScores).toHaveLength(1)
    expect(result.current.orderedTeams[0].score).toBe(50)

    const mimicaScore = result.current.session.mimicaScores?.[0]
    expect(mimicaScore).toMatchObject({
      participantId: 'participant-1',
      teamId: 'team-1',
      pointsAwarded: 50,
      turnNumber: 1,
      roundNumber: 1,
      mode: 'full-current',
    })
  })

  it('deve testar múltiplas voltas na mimica', async () => {
    const { result } = renderHook(() => useTriviaSession(), { wrapper })

    await act(async () => {
      const teams = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          order: 0,
          members: ['participant-1'],
          score: 0,
        },
      ]
      const participants = [
        {
          id: 'participant-1',
          name: 'Participante 1',
          role: 'player' as const,
          teamId: 'team-1',
        },
      ]
      result.current.updateTeamsAndParticipants(teams, participants)
    })

    await act(async () => {
      result.current.awardMimicaPoints(
        'participant-1',
        'team-1',
        50,
        1,
        1,
        'full-current'
      )
      result.current.awardMimicaPoints(
        'participant-1',
        'team-1',
        30,
        1,
        2,
        'half-current'
      )
    })

    expect(result.current.session.mimicaScores).toHaveLength(2)
    expect(result.current.orderedTeams[0].score).toBe(80)

    const round1Score = result.current.session.mimicaScores?.find(s => s.roundNumber === 1)
    const round2Score = result.current.session.mimicaScores?.find(s => s.roundNumber === 2)

    expect(round1Score?.roundNumber).toBe(1)
    expect(round2Score?.roundNumber).toBe(2)
  })

  it('não deve quebrar funcionalidades existentes ao usar mimica', async () => {
    const { result } = renderHook(() => useTriviaSession(), { wrapper })

    await act(async () => {
      const teams = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          order: 0,
          members: ['participant-1'],
          score: 0,
        },
      ]
      const participants = [
        {
          id: 'participant-1',
          name: 'Participante 1',
          role: 'player' as const,
          teamId: 'team-1',
        },
      ]
      result.current.updateTeamsAndParticipants(teams, participants)
      const columnId = result.current.addFilmColumn('Filme 1')
      const tileId = result.current.addQuestionTile(columnId, { points: 10, question: 'Q', answer: 'A' })
      result.current.awardPoints(tileId, 'team-1', 'participant-1', 10, 'trivia')
    })

    await act(async () => {
      result.current.awardMimicaPoints(
        'participant-1',
        'team-1',
        50,
        1,
        1,
        'full-current'
      )
    })

    expect(result.current.session.mimicaScores).toHaveLength(1)
    expect(result.current.session.board[0].tiles[0].answeredBy).toBeDefined()
    expect(result.current.orderedTeams[0].score).toBe(60)
  })
})

