import '@testing-library/jest-dom'
import React from 'react'
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

describe('TriviaSessionProvider - Mimica Scoring', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUseGameMode.mockReturnValue({
      gameMode: 'demo',
      isDemo: true,
      isOffline: false,
      isOnline: false,
      getModeDisplayName: jest.fn(),
      getModeDescription: jest.fn(),
    })
  })

  it('deve criar entrada em mimicaScores quando awardMimicaPoints é chamado', async () => {
    const { result } = renderHook(() => useTriviaSession(), { wrapper })

    await act(async () => {
      // Primeiro precisa ter times e participantes configurados
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
    expect(result.current.session.mimicaScores?.[0]).toMatchObject({
      participantId: 'participant-1',
      teamId: 'team-1',
      pointsAwarded: 50,
      turnNumber: 1,
      roundNumber: 1,
      mode: 'full-current',
    })
  })

  it('não deve criar entrada em mimicaScores quando awardPoints é chamado com source trivia', async () => {
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

    expect(result.current.session.mimicaScores || []).toHaveLength(0)
  })

  it('deve somar pontos corretamente no time quando awardMimicaPoints é chamado', async () => {
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

    const team = result.current.orderedTeams.find((t) => t.id === 'team-1')
    expect(team?.score).toBe(50)
  })

  it('deve rastrear turnNumber e roundNumber corretamente', async () => {
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
        30,
        5,
        2,
        'half-current'
      )
    })

    const score = result.current.session.mimicaScores?.[0]
    expect(score?.turnNumber).toBe(5)
    expect(score?.roundNumber).toBe(2)
  })

  it('deve rastrear targetTeamId no modo steal', async () => {
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
        {
          id: 'team-2',
          name: 'Time 2',
          color: '#fff',
          order: 1,
          members: ['participant-2'],
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
        {
          id: 'participant-2',
          name: 'Participante 2',
          role: 'player' as const,
          teamId: 'team-2',
        },
      ]
      result.current.updateTeamsAndParticipants(teams, participants)
    })

    await act(async () => {
      result.current.awardMimicaPoints(
        'participant-1',
        'team-2',
        50,
        1,
        1,
        'steal',
        'team-2'
      )
    })

    const score = result.current.session.mimicaScores?.[0]
    expect(score?.mode).toBe('steal')
    expect(score?.targetTeamId).toBe('team-2')
  })

  it('deve acumular múltiplas pontuações de mimica', async () => {
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
        25,
        2,
        1,
        'half-current'
      )
    })

    expect(result.current.session.mimicaScores).toHaveLength(2)
    const team = result.current.orderedTeams.find((t) => t.id === 'team-1')
    expect(team?.score).toBe(75)
  })
})

