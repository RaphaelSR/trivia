import { renderHook, act } from '@testing-library/react'
import { useSessionManagement } from '@/modules/control/hooks/useSessionManagement'
import type { TriviaSession, TriviaTeam, TriviaParticipant, TriviaColumn } from '@/modules/trivia/types'
import { createEmptySession } from '@/modules/trivia/utils/createEmptySession'

const mockUpdateTeamsAndParticipants = jest.fn()
const mockRemoveQuestionTile = jest.fn()
const mockRemoveFilmColumn = jest.fn()
const mockSetTheme = jest.fn()
const mockSaveCustomPin = jest.fn()
const mockSetGameEndNotified = jest.fn()
const mockLoadSession = jest.fn()
const mockRestoreSession = jest.fn()

const mockTeams: TriviaTeam[] = [
  {
    id: 'team-1',
    name: 'Time 1',
    color: '#ff0000',
    order: 0,
    members: ['participant-1', 'participant-2'],
    score: 100,
  },
  {
    id: 'team-2',
    name: 'Time 2',
    color: '#0000ff',
    order: 1,
    members: ['participant-3'],
    score: 50,
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

const mockBoard: TriviaColumn[] = [
  {
    id: 'column-1',
    filmId: 'film-1',
    film: 'Matrix',
    tiles: [
      {
        id: 'tile-1',
        film: 'Matrix',
        points: 10,
        state: 'available',
        question: 'Pergunta 1?',
        answer: 'Resposta 1',
      },
      {
        id: 'tile-2',
        film: 'Matrix',
        points: 20,
        state: 'answered',
        question: 'Pergunta 2?',
        answer: 'Resposta 2',
        answeredBy: {
          participantId: 'participant-1',
          teamId: 'team-1',
          pointsAwarded: 20,
          timestamp: new Date().toISOString(),
        },
      },
    ],
  },
  {
    id: 'column-2',
    filmId: 'film-2',
    film: 'Titanic',
    tiles: [
      {
        id: 'tile-3',
        film: 'Titanic',
        points: 15,
        state: 'available',
        question: 'Pergunta 3?',
        answer: 'Resposta 3',
      },
    ],
  },
]

const mockSession: TriviaSession = {
  ...createEmptySession(),
  id: 'session-1',
  title: 'Sessão de Teste',
  teams: mockTeams,
  participants: mockParticipants,
  board: mockBoard,
  turnSequence: ['participant-1', 'participant-3', 'participant-2'],
  activeTeamId: 'team-1',
  activeParticipantId: 'participant-1',
}

describe('useSessionManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('loadSessionById', () => {
    it('deve restaurar sessão completa incluindo board', () => {
      mockLoadSession.mockReturnValue(mockSession)

      const { result } = renderHook(() =>
        useSessionManagement(
          mockTeams,
          mockParticipants,
          [],
          mockUpdateTeamsAndParticipants,
          mockRemoveQuestionTile,
          mockRemoveFilmColumn,
          mockSetTheme,
          mockSaveCustomPin,
          mockLoadSession,
          mockRestoreSession,
          mockSetGameEndNotified
        )
      )

      act(() => {
        result.current.loadSessionById('session-1')
      })

      expect(mockLoadSession).toHaveBeenCalledWith('session-1')
      expect(mockRestoreSession).toHaveBeenCalledWith(mockSession)
    })

    it('deve retornar true quando sessão é carregada com sucesso', () => {
      mockLoadSession.mockReturnValue(mockSession)

      const { result } = renderHook(() =>
        useSessionManagement(
          mockTeams,
          mockParticipants,
          [],
          mockUpdateTeamsAndParticipants,
          mockRemoveQuestionTile,
          mockRemoveFilmColumn,
          mockSetTheme,
          mockSaveCustomPin,
          mockLoadSession,
          mockRestoreSession,
          mockSetGameEndNotified
        )
      )

      let loadResult: boolean | undefined
      act(() => {
        loadResult = result.current.loadSessionById('session-1')
      })

      expect(loadResult).toBe(true)
    })

    it('deve retornar false quando sessão não é encontrada', () => {
      mockLoadSession.mockReturnValue(null)

      const { result } = renderHook(() =>
        useSessionManagement(
          mockTeams,
          mockParticipants,
          [],
          mockUpdateTeamsAndParticipants,
          mockRemoveQuestionTile,
          mockRemoveFilmColumn,
          mockSetTheme,
          mockSaveCustomPin,
          mockLoadSession,
          mockRestoreSession,
          mockSetGameEndNotified
        )
      )

      let loadResult: boolean | undefined
      act(() => {
        loadResult = result.current.loadSessionById('session-inexistente')
      })

      expect(loadResult).toBe(false)
      expect(mockRestoreSession).not.toHaveBeenCalled()
    })

    it('deve restaurar todos os dados da sessão: teams, participants, board, turnSequence, title', () => {
      mockLoadSession.mockReturnValue(mockSession)

      const { result } = renderHook(() =>
        useSessionManagement(
          mockTeams,
          mockParticipants,
          [],
          mockUpdateTeamsAndParticipants,
          mockRemoveQuestionTile,
          mockRemoveFilmColumn,
          mockSetTheme,
          mockSaveCustomPin,
          mockLoadSession,
          mockRestoreSession,
          mockSetGameEndNotified
        )
      )

      act(() => {
        result.current.loadSessionById('session-1')
      })

      expect(mockRestoreSession).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'session-1',
          title: 'Sessão de Teste',
          teams: mockTeams,
          participants: mockParticipants,
          board: mockBoard,
          turnSequence: ['participant-1', 'participant-3', 'participant-2'],
          activeTeamId: 'team-1',
          activeParticipantId: 'participant-1',
        })
      )
    })

    it('deve restaurar board completo com filmes e perguntas', () => {
      mockLoadSession.mockReturnValue(mockSession)

      const { result } = renderHook(() =>
        useSessionManagement(
          mockTeams,
          mockParticipants,
          [],
          mockUpdateTeamsAndParticipants,
          mockRemoveQuestionTile,
          mockRemoveFilmColumn,
          mockSetTheme,
          mockSaveCustomPin,
          mockLoadSession,
          mockRestoreSession,
          mockSetGameEndNotified
        )
      )

      act(() => {
        result.current.loadSessionById('session-1')
      })

      const restoredSession = mockRestoreSession.mock.calls[0][0]
      expect(restoredSession.board).toHaveLength(2)
      expect(restoredSession.board[0].film).toBe('Matrix')
      expect(restoredSession.board[0].tiles).toHaveLength(2)
      expect(restoredSession.board[1].film).toBe('Titanic')
      expect(restoredSession.board[1].tiles).toHaveLength(1)
    })

    it('deve restaurar perguntas respondidas com answeredBy', () => {
      mockLoadSession.mockReturnValue(mockSession)

      const { result } = renderHook(() =>
        useSessionManagement(
          mockTeams,
          mockParticipants,
          [],
          mockUpdateTeamsAndParticipants,
          mockRemoveQuestionTile,
          mockRemoveFilmColumn,
          mockSetTheme,
          mockSaveCustomPin,
          mockLoadSession,
          mockRestoreSession,
          mockSetGameEndNotified
        )
      )

      act(() => {
        result.current.loadSessionById('session-1')
      })

      const restoredSession = mockRestoreSession.mock.calls[0][0]
      const answeredTile = restoredSession.board[0].tiles.find((t: { id: string }) => t.id === 'tile-2')
      expect(answeredTile?.state).toBe('answered')
      expect(answeredTile?.answeredBy).toEqual({
        participantId: 'participant-1',
        teamId: 'team-1',
        pointsAwarded: 20,
        timestamp: expect.any(String),
      })
    })

    it('deve restaurar pontuações dos times', () => {
      mockLoadSession.mockReturnValue(mockSession)

      const { result } = renderHook(() =>
        useSessionManagement(
          mockTeams,
          mockParticipants,
          [],
          mockUpdateTeamsAndParticipants,
          mockRemoveQuestionTile,
          mockRemoveFilmColumn,
          mockSetTheme,
          mockSaveCustomPin,
          mockLoadSession,
          mockRestoreSession,
          mockSetGameEndNotified
        )
      )

      act(() => {
        result.current.loadSessionById('session-1')
      })

      const restoredSession = mockRestoreSession.mock.calls[0][0]
      expect(restoredSession.teams[0].score).toBe(100)
      expect(restoredSession.teams[1].score).toBe(50)
    })
  })
})

