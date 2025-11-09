import {
  calculateTotalQuestions,
  generateTurnSequence,
  convertDraftsToTeams,
  convertDraftsToParticipants,
} from '../../../../modules/control/utils/sessionUtils'
import type { TriviaColumn, TriviaTeam, TriviaParticipant } from '../../../../modules/trivia/types'
import { createBalancedTurnSequence } from '../../../../modules/trivia/utils/createBalancedTurnSequence'
import { createAlternatingTurnSequence } from '../../../../modules/trivia/utils/createAlternatingTurnSequence'

jest.mock('../../../../modules/trivia/utils/createBalancedTurnSequence')
jest.mock('../../../../modules/trivia/utils/createAlternatingTurnSequence')

describe('sessionUtils', () => {
  describe('calculateTotalQuestions', () => {
    it('deve somar tiles de todas as colunas', () => {
      const board: TriviaColumn[] = [
        { id: 'col-1', film: 'Filme 1', filmId: 'film-1', tiles: [{ id: 'tile-1' } as any, { id: 'tile-2' } as any] },
        { id: 'col-2', film: 'Filme 2', filmId: 'film-2', tiles: [{ id: 'tile-3' } as any] },
        { id: 'col-3', film: 'Filme 3', filmId: 'film-3', tiles: [] },
      ]

      expect(calculateTotalQuestions(board)).toBe(3)
    })

    it('deve retornar 0 para board vazio', () => {
      expect(calculateTotalQuestions([])).toBe(0)
    })

    it('deve retornar 0 para colunas sem tiles', () => {
      const board: TriviaColumn[] = [
        { id: 'col-1', film: 'Filme 1', filmId: 'film-1', tiles: [] },
        { id: 'col-2', film: 'Filme 2', filmId: 'film-2', tiles: [] },
      ]

      expect(calculateTotalQuestions(board)).toBe(0)
    })
  })

  describe('generateTurnSequence', () => {
    const mockCreateBalancedTurnSequence = createBalancedTurnSequence as jest.MockedFunction<typeof createBalancedTurnSequence>
    const mockCreateAlternatingTurnSequence = createAlternatingTurnSequence as jest.MockedFunction<typeof createAlternatingTurnSequence>

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('deve usar createBalancedTurnSequence quando totalQuestions > 0', () => {
      const teams: TriviaTeam[] = [
        { id: 'team-1', name: 'Team 1', color: '#000', order: 0, members: ['p1'], score: 0 },
      ]
      const board: TriviaColumn[] = [
        { id: 'col-1', film: 'Filme 1', filmId: 'film-1', tiles: [{ id: 'tile-1' } as any] },
      ]

      mockCreateBalancedTurnSequence.mockReturnValue(['p1'])
      const result = generateTurnSequence(teams, board)

      expect(mockCreateBalancedTurnSequence).toHaveBeenCalledWith(teams, 1)
      expect(mockCreateAlternatingTurnSequence).not.toHaveBeenCalled()
      expect(result).toEqual(['p1'])
    })

    it('deve usar createAlternatingTurnSequence quando totalQuestions é 0', () => {
      const teams: TriviaTeam[] = [
        { id: 'team-1', name: 'Team 1', color: '#000', order: 0, members: ['p1'], score: 0 },
      ]
      const board: TriviaColumn[] = []

      mockCreateAlternatingTurnSequence.mockReturnValue(['p1'])
      const result = generateTurnSequence(teams, board)

      expect(mockCreateAlternatingTurnSequence).toHaveBeenCalledWith(teams)
      expect(mockCreateBalancedTurnSequence).not.toHaveBeenCalled()
      expect(result).toEqual(['p1'])
    })
  })

  describe('convertDraftsToTeams', () => {
    it('deve converter teamDrafts para TriviaTeam[]', () => {
      const teamDrafts = [
        {
          id: 'team-1',
          name: 'Team 1',
          color: '#000',
          members: [
            { id: 'p1', name: 'P1', role: 'player' as const },
            { id: 'p2', name: 'P2', role: 'host' as const },
          ],
        },
        {
          id: 'team-2',
          name: 'Team 2',
          color: '#fff',
          members: [{ id: 'p3', name: 'P3', role: 'player' as const }],
        },
      ]
      const existingTeams: TriviaTeam[] = [
        { id: 'team-1', name: 'Team 1', color: '#000', order: 0, members: ['p1', 'p2'], score: 100 },
      ]

      const result = convertDraftsToTeams(teamDrafts, existingTeams)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('team-1')
      expect(result[0].name).toBe('Team 1')
      expect(result[0].color).toBe('#000')
      expect(result[0].order).toBe(0)
      expect(result[0].members).toEqual(['p1', 'p2'])
      expect(result[0].score).toBe(100) // Mantém score existente

      expect(result[1].id).toBe('team-2')
      expect(result[1].name).toBe('Team 2')
      expect(result[1].order).toBe(1)
      expect(result[1].score).toBe(0) // Novo time sem score
    })

    it('deve usar nome padrão se name estiver vazio', () => {
      const teamDrafts = [
        {
          id: 'team-1',
          name: '   ',
          color: '#000',
          members: [{ id: 'p1', name: 'P1', role: 'player' as const }],
        },
      ]

      const result = convertDraftsToTeams(teamDrafts, [])
      expect(result[0].name).toBe('Time 1')
    })

    it('deve usar cor padrão se color estiver vazio', () => {
      const teamDrafts = [
        {
          id: 'team-1',
          name: 'Team 1',
          color: '',
          members: [{ id: 'p1', name: 'P1', role: 'player' as const }],
        },
      ]

      const result = convertDraftsToTeams(teamDrafts, [])
      expect(result[0].color).toBe('var(--color-primary)')
    })
  })

  describe('convertDraftsToParticipants', () => {
    it('deve converter teamDrafts para TriviaParticipant[]', () => {
      const teamDrafts = [
        {
          id: 'team-1',
          members: [
            { id: 'p1', name: 'P1', role: 'player' as const },
            { id: 'p2', name: 'P2', role: 'host' as const },
          ],
        },
        {
          id: 'team-2',
          members: [{ id: 'p3', name: 'P3', role: 'assistant' as const }],
        },
      ]

      const result = convertDraftsToParticipants(teamDrafts)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        id: 'p1',
        name: 'P1',
        role: 'player',
        teamId: 'team-1',
      })
      expect(result[1]).toEqual({
        id: 'p2',
        name: 'P2',
        role: 'host',
        teamId: 'team-1',
      })
      expect(result[2]).toEqual({
        id: 'p3',
        name: 'P3',
        role: 'assistant',
        teamId: 'team-2',
      })
    })

    it('deve usar nome padrão se name estiver vazio', () => {
      const teamDrafts = [
        {
          id: 'team-1',
          members: [{ id: 'p1', name: '   ', role: 'player' as const }],
        },
      ]

      const result = convertDraftsToParticipants(teamDrafts)
      expect(result[0].name).toBe('Participante')
    })
  })
})

