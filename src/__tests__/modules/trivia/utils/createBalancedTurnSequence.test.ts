import { createBalancedTurnSequence } from '../../../../modules/trivia/utils/createBalancedTurnSequence'
import type { TriviaTeam } from '../../../../modules/trivia/types'

describe('createBalancedTurnSequence', () => {
  const createTeam = (id: string, name: string, memberIds: string[], order: number = 0): TriviaTeam => ({
    id,
    name,
    color: `#${id}`,
    order,
    members: memberIds,
    score: 0,
  })

  const getTeamIdFromParticipant = (sequence: string[], teams: TriviaTeam[]): string[] => {
    return sequence.map(participantId => {
      const team = teams.find(t => t.members.includes(participantId))
      return team?.id || 'unknown'
    })
  }

  const hasConsecutiveSameTeam = (teamIds: string[]): boolean => {
    for (let i = 0; i < teamIds.length - 1; i++) {
      if (teamIds[i] === teamIds[i + 1]) {
        return true
      }
    }
    return false
  }

  const countTurnsPerTeam = (sequence: string[], teams: TriviaTeam[]): Record<string, number> => {
    const counts: Record<string, number> = {}
    teams.forEach(team => {
      counts[team.id] = sequence.filter(id => team.members.includes(id)).length
    })
    return counts
  }

  describe('Cenário Principal: 36 perguntas, 3 times (4-3-3)', () => {
    it('deve gerar sequência com exatamente 36 elementos', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Guardiões do Cinema', ['A1', 'A2', 'A3', 'A4'], 0),
        createTeam('team-b', 'Absolute Cinema', ['B1', 'B2', 'B3'], 1),
        createTeam('team-c', 'Darth Apperol', ['C1', 'C2', 'C3'], 2),
      ]

      const sequence = createBalancedTurnSequence(teams, 36)
      expect(sequence.length).toBe(36)
    })

    it('deve manter alternância perfeita entre times', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Guardiões do Cinema', ['A1', 'A2', 'A3', 'A4'], 0),
        createTeam('team-b', 'Absolute Cinema', ['B1', 'B2', 'B3'], 1),
        createTeam('team-c', 'Darth Apperol', ['C1', 'C2', 'C3'], 2),
      ]

      const sequence = createBalancedTurnSequence(teams, 36)
      const teamIds = getTeamIdFromParticipant(sequence, teams)

      // Valida alternância perfeita
      expect(hasConsecutiveSameTeam(teamIds)).toBe(false)
      
      // Valida padrão A → B → C repetido
      for (let i = 0; i < 36; i++) {
        const expectedTeamIndex = i % 3
        const expectedTeamId = teams[expectedTeamIndex].id
        expect(teamIds[i]).toBe(expectedTeamId)
      }
    })

    it('deve distribuir turnos aproximadamente igualmente entre times', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Guardiões do Cinema', ['A1', 'A2', 'A3', 'A4'], 0),
        createTeam('team-b', 'Absolute Cinema', ['B1', 'B2', 'B3'], 1),
        createTeam('team-c', 'Darth Apperol', ['C1', 'C2', 'C3'], 2),
      ]

      const sequence = createBalancedTurnSequence(teams, 36)
      const counts = countTurnsPerTeam(sequence, teams)

      // Cada time deve ter aproximadamente 12 turnos (36/3 = 12)
      // Pode variar 1 turno devido à alternância
      expect(counts['team-a']).toBe(12)
      expect(counts['team-b']).toBe(12)
      expect(counts['team-c']).toBe(12)
    })

    it('deve reutilizar jogadores de times menores (ciclo circular)', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Guardiões do Cinema', ['A1', 'A2', 'A3', 'A4'], 0),
        createTeam('team-b', 'Absolute Cinema', ['B1', 'B2', 'B3'], 1),
        createTeam('team-c', 'Darth Apperol', ['C1', 'C2', 'C3'], 2),
      ]

      const sequence = createBalancedTurnSequence(teams, 36)
      
      // Time B (3 jogadores) deve ter seus jogadores repetidos mais vezes
      // Time B joga nos turnos 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
      // roundIndex para Time B: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
      // participantIndex: 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2
      // Então: B1, B2, B3, B1, B2, B3, B1, B2, B3, B1, B2, B3
      
      const teamBTurns = sequence.filter((_, index) => index % 3 === 1) // Turnos do Time B
      expect(teamBTurns[0]).toBe('B1') // roundIndex 0
      expect(teamBTurns[1]).toBe('B2') // roundIndex 1
      expect(teamBTurns[2]).toBe('B3') // roundIndex 2
      expect(teamBTurns[3]).toBe('B1') // roundIndex 3 (volta ao primeiro)
      expect(teamBTurns[4]).toBe('B2') // roundIndex 4
    })

    it('deve gerar sequência esperada para 36 perguntas', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Guardiões do Cinema', ['A1', 'A2', 'A3', 'A4'], 0),
        createTeam('team-b', 'Absolute Cinema', ['B1', 'B2', 'B3'], 1),
        createTeam('team-c', 'Darth Apperol', ['C1', 'C2', 'C3'], 2),
      ]

      const sequence = createBalancedTurnSequence(teams, 36)
      
      // Primeiros 12 turnos (4 rodadas completas)
      expect(sequence.slice(0, 12)).toEqual([
        'A1', 'B1', 'C1', // Rodada 0
        'A2', 'B2', 'C2', // Rodada 1
        'A3', 'B3', 'C3', // Rodada 2
        'A4', 'B1', 'C1', // Rodada 3 (B e C voltam ao primeiro)
      ])
      
      // Próximos 12 turnos (rodadas 4-7)
      expect(sequence.slice(12, 24)).toEqual([
        'A1', 'B2', 'C2', // Rodada 4 (A volta ao primeiro)
        'A2', 'B3', 'C3', // Rodada 5
        'A3', 'B1', 'C1', // Rodada 6
        'A4', 'B2', 'C2', // Rodada 7
      ])
    })
  })

  describe('Diferentes combinações', () => {
    it('deve funcionar com 30 perguntas, 3 times (4-4-4)', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Time A', ['A1', 'A2', 'A3', 'A4'], 0),
        createTeam('team-b', 'Time B', ['B1', 'B2', 'B3', 'B4'], 1),
        createTeam('team-c', 'Time C', ['C1', 'C2', 'C3', 'C4'], 2),
      ]

      const sequence = createBalancedTurnSequence(teams, 30)
      const teamIds = getTeamIdFromParticipant(sequence, teams)
      const counts = countTurnsPerTeam(sequence, teams)

      expect(sequence.length).toBe(30)
      expect(hasConsecutiveSameTeam(teamIds)).toBe(false)
      expect(counts['team-a']).toBe(10)
      expect(counts['team-b']).toBe(10)
      expect(counts['team-c']).toBe(10)
    })

    it('deve funcionar com 20 perguntas, 2 times (4-3)', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Time A', ['A1', 'A2', 'A3', 'A4'], 0),
        createTeam('team-b', 'Time B', ['B1', 'B2', 'B3'], 1),
      ]

      const sequence = createBalancedTurnSequence(teams, 20)
      const teamIds = getTeamIdFromParticipant(sequence, teams)
      const counts = countTurnsPerTeam(sequence, teams)

      expect(sequence.length).toBe(20)
      expect(hasConsecutiveSameTeam(teamIds)).toBe(false)
      
      // Alternância A → B
      for (let i = 0; i < 20; i++) {
        const expectedTeamIndex = i % 2
        expect(teamIds[i]).toBe(teams[expectedTeamIndex].id)
      }
      
      expect(counts['team-a']).toBe(10)
      expect(counts['team-b']).toBe(10)
    })

    it('deve funcionar com número ímpar de perguntas', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Time A', ['A1', 'A2'], 0),
        createTeam('team-b', 'Time B', ['B1', 'B2'], 1),
        createTeam('team-c', 'Time C', ['C1', 'C2'], 2),
      ]

      const sequence = createBalancedTurnSequence(teams, 35)
      const teamIds = getTeamIdFromParticipant(sequence, teams)

      expect(sequence.length).toBe(35)
      expect(hasConsecutiveSameTeam(teamIds)).toBe(false)
      
      // Último turno: turnIndex 34, teamIndex = 34 % 3 = 1, então é do Time B
      expect(teamIds[34]).toBe('team-b')
    })
  })

  describe('Casos extremos', () => {
    it('deve funcionar com apenas 1 time', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Time A', ['A1', 'A2', 'A3'], 0),
      ]

      const sequence = createBalancedTurnSequence(teams, 10)
      
      expect(sequence.length).toBe(10)
      // Deve ciclar entre os jogadores
      expect(sequence).toEqual(['A1', 'A2', 'A3', 'A1', 'A2', 'A3', 'A1', 'A2', 'A3', 'A1'])
    })

    it('deve funcionar com times de 1 jogador cada', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Time A', ['A1'], 0),
        createTeam('team-b', 'Time B', ['B1'], 1),
        createTeam('team-c', 'Time C', ['C1'], 2),
      ]

      const sequence = createBalancedTurnSequence(teams, 9)
      const teamIds = getTeamIdFromParticipant(sequence, teams)

      expect(sequence.length).toBe(9)
      expect(hasConsecutiveSameTeam(teamIds)).toBe(false)
      expect(sequence).toEqual(['A1', 'B1', 'C1', 'A1', 'B1', 'C1', 'A1', 'B1', 'C1'])
    })

    it('deve retornar array vazio se não houver times', () => {
      const teams: TriviaTeam[] = []
      const sequence = createBalancedTurnSequence(teams, 36)
      expect(sequence).toEqual([])
    })

    it('deve retornar array vazio se totalQuestions for 0', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Time A', ['A1', 'A2'], 0),
      ]
      const sequence = createBalancedTurnSequence(teams, 0)
      expect(sequence).toEqual([])
    })
  })

  describe('Validação geral', () => {
    it('nunca deve ter dois turnos consecutivos do mesmo time em qualquer cenário', () => {
      const testCases = [
        { name: '36 perguntas, 3 times (4-3-3)', teams: [
          createTeam('team-a', 'Time A', ['A1', 'A2', 'A3', 'A4'], 0),
          createTeam('team-b', 'Time B', ['B1', 'B2', 'B3'], 1),
          createTeam('team-c', 'Time C', ['C1', 'C2', 'C3'], 2),
        ], totalQuestions: 36 },
        { name: '30 perguntas, 3 times (4-4-4)', teams: [
          createTeam('team-a', 'Time A', ['A1', 'A2', 'A3', 'A4'], 0),
          createTeam('team-b', 'Time B', ['B1', 'B2', 'B3', 'B4'], 1),
          createTeam('team-c', 'Time C', ['C1', 'C2', 'C3', 'C4'], 2),
        ], totalQuestions: 30 },
        { name: '20 perguntas, 2 times (4-3)', teams: [
          createTeam('team-a', 'Time A', ['A1', 'A2', 'A3', 'A4'], 0),
          createTeam('team-b', 'Time B', ['B1', 'B2', 'B3'], 1),
        ], totalQuestions: 20 },
      ]

      testCases.forEach(({ name: _name, teams, totalQuestions }) => {
        const sequence = createBalancedTurnSequence(teams, totalQuestions)
        const teamIds = getTeamIdFromParticipant(sequence, teams)
        
        expect(hasConsecutiveSameTeam(teamIds)).toBe(false)
        expect(sequence.length).toBe(totalQuestions)
      })
    })

    it('deve garantir que todos os times participam enquanto houver perguntas', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Time A', ['A1', 'A2'], 0),
        createTeam('team-b', 'Time B', ['B1', 'B2'], 1),
        createTeam('team-c', 'Time C', ['C1', 'C2'], 2),
      ]

      const sequence = createBalancedTurnSequence(teams, 15)
      const counts = countTurnsPerTeam(sequence, teams)

      // Todos os times devem participar
      expect(counts['team-a']).toBeGreaterThan(0)
      expect(counts['team-b']).toBeGreaterThan(0)
      expect(counts['team-c']).toBeGreaterThan(0)
      
      // Distribuição deve ser aproximadamente igual (pode variar 1)
      const minTurns = Math.min(counts['team-a'], counts['team-b'], counts['team-c'])
      const maxTurns = Math.max(counts['team-a'], counts['team-b'], counts['team-c'])
      expect(maxTurns - minTurns).toBeLessThanOrEqual(1)
    })
  })
})

