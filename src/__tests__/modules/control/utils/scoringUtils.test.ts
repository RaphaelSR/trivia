import {
  calculatePoints,
  calculatePercentage,
  applyQuickScoringOption,
  updateTeamDistribution,
  getTeamParticipants,
  isValidScoring,
} from '../../../../modules/control/utils/scoringUtils'
import type { QuickScoringOption, PointDistribution } from '../../../../modules/control/types/control.types'
import type { TriviaParticipant } from '../../../../modules/trivia/types'

describe('scoringUtils', () => {
  describe('calculatePoints', () => {
    it('deve calcular pontos com multiplicador 0.5', () => {
      expect(calculatePoints(100, 0.5)).toBe(50)
      expect(calculatePoints(30, 0.5)).toBe(15)
    })

    it('deve calcular pontos com multiplicador 1.0', () => {
      expect(calculatePoints(100, 1.0)).toBe(100)
      expect(calculatePoints(30, 1.0)).toBe(30)
    })

    it('deve calcular pontos com multiplicador 1.5', () => {
      expect(calculatePoints(100, 1.5)).toBe(150)
      expect(calculatePoints(30, 1.5)).toBe(45)
    })

    it('deve arredondar pontos corretamente', () => {
      expect(calculatePoints(33, 0.5)).toBe(17) // 16.5 arredondado
      expect(calculatePoints(33, 1.5)).toBe(50) // 49.5 arredondado
    })
  })

  describe('calculatePercentage', () => {
    it('deve calcular porcentagem corretamente', () => {
      expect(calculatePercentage(50, 100)).toBe(50)
      expect(calculatePercentage(25, 100)).toBe(25)
      expect(calculatePercentage(150, 100)).toBe(150)
    })

    it('deve arredondar porcentagem corretamente', () => {
      expect(calculatePercentage(33, 100)).toBe(33)
      expect(calculatePercentage(33.3, 100)).toBe(33)
      expect(calculatePercentage(33.7, 100)).toBe(34)
    })
  })

  describe('applyQuickScoringOption', () => {
    it('deve aplicar opção current-team com activeTeamId', () => {
      const option: QuickScoringOption = {
        id: 'test',
        title: 'Test',
        subtitle: 'Test',
        multiplier: 1.0,
        target: 'current-team',
      }

      const result = applyQuickScoringOption(option, 100, 'team-1', 'participant-1')
      expect(result).toHaveLength(1)
      expect(result[0].teamId).toBe('team-1')
      expect(result[0].participantId).toBe('participant-1')
      expect(result[0].points).toBe(100)
    })

    it('deve aplicar opção current-team sem activeParticipantId', () => {
      const option: QuickScoringOption = {
        id: 'test',
        title: 'Test',
        subtitle: 'Test',
        multiplier: 0.5,
        target: 'current-team',
      }

      const result = applyQuickScoringOption(option, 100, 'team-1', null)
      expect(result).toHaveLength(1)
      expect(result[0].teamId).toBe('team-1')
      expect(result[0].participantId).toBeUndefined()
      expect(result[0].points).toBe(50)
    })

    it('deve retornar array vazio se activeTeamId for null', () => {
      const option: QuickScoringOption = {
        id: 'test',
        title: 'Test',
        subtitle: 'Test',
        multiplier: 1.0,
        target: 'current-team',
      }

      const result = applyQuickScoringOption(option, 100, null, null)
      expect(result).toHaveLength(0)
    })

    it('deve aplicar opção none retornando array vazio', () => {
      const option: QuickScoringOption = {
        id: 'test',
        title: 'Test',
        subtitle: 'Test',
        multiplier: 0,
        target: 'none',
      }

      const result = applyQuickScoringOption(option, 100, 'team-1', 'participant-1')
      expect(result).toHaveLength(0)
    })
  })

  describe('updateTeamDistribution', () => {
    it('deve adicionar distribuição para time novo', () => {
      const distributions: PointDistribution[] = []
      const result = updateTeamDistribution(distributions, 'team-1', 100)
      expect(result).toHaveLength(1)
      expect(result[0].teamId).toBe('team-1')
      expect(result[0].points).toBe(100)
    })

    it('deve atualizar distribuição existente', () => {
      const distributions: PointDistribution[] = [
        { teamId: 'team-1', points: 50 },
        { teamId: 'team-2', points: 30 },
      ]
      const result = updateTeamDistribution(distributions, 'team-1', 100)
      expect(result).toHaveLength(2)
      expect(result.find(d => d.teamId === 'team-1')?.points).toBe(100)
      expect(result.find(d => d.teamId === 'team-2')?.points).toBe(30)
    })

    it('deve remover distribuição quando points é 0', () => {
      const distributions: PointDistribution[] = [
        { teamId: 'team-1', points: 50 },
        { teamId: 'team-2', points: 30 },
      ]
      const result = updateTeamDistribution(distributions, 'team-1', 0)
      expect(result).toHaveLength(1)
      expect(result[0].teamId).toBe('team-2')
    })
  })

  describe('getTeamParticipants', () => {
    it('deve filtrar participantes por time', () => {
      const participants: TriviaParticipant[] = [
        { id: 'p1', name: 'P1', role: 'player', teamId: 'team-1' },
        { id: 'p2', name: 'P2', role: 'player', teamId: 'team-1' },
        { id: 'p3', name: 'P3', role: 'player', teamId: 'team-2' },
      ]

      const result = getTeamParticipants(participants, 'team-1')
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('p1')
      expect(result[1].id).toBe('p2')
    })

    it('deve retornar array vazio se não houver participantes do time', () => {
      const participants: TriviaParticipant[] = [
        { id: 'p1', name: 'P1', role: 'player', teamId: 'team-1' },
      ]

      const result = getTeamParticipants(participants, 'team-2')
      expect(result).toHaveLength(0)
    })
  })

  describe('isValidScoring', () => {
    it('deve retornar true para modo quick quando quickModeSelected é true', () => {
      expect(isValidScoring('quick', true, [])).toBe(true)
    })

    it('deve retornar false para modo quick quando quickModeSelected é false', () => {
      expect(isValidScoring('quick', false, [])).toBe(false)
    })

    it('deve retornar true para modo advanced quando há distribuições', () => {
      const distributions: PointDistribution[] = [
        { teamId: 'team-1', points: 100 },
      ]
      expect(isValidScoring('advanced', false, distributions)).toBe(true)
    })

    it('deve retornar false para modo advanced quando não há distribuições', () => {
      expect(isValidScoring('advanced', false, [])).toBe(false)
    })
  })
})

