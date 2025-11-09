import { createAlternatingTurnSequence } from '../../../../modules/trivia/utils/createAlternatingTurnSequence'
import type { TriviaTeam } from '../../../../modules/trivia/types'

describe('createAlternatingTurnSequence', () => {
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

  describe('Cenário: 3 times (4-3-3 jogadores)', () => {
    it('deve alternar corretamente entre times', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Guardiões do Cinema', ['A1', 'A2', 'A3', 'A4'], 0),
        createTeam('team-b', 'Absolute Cinema', ['B1', 'B2', 'B3'], 1),
        createTeam('team-c', 'Darth Apperol', ['C1', 'C2', 'C3'], 2),
      ]

      const sequence = createAlternatingTurnSequence(teams)
      const teamIds = getTeamIdFromParticipant(sequence, teams)

      expect(sequence.length).toBe(10)
      expect(sequence).toEqual(['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3', 'A4'])
      expect(hasConsecutiveSameTeam(teamIds)).toBe(false)
    })

    it('nunca deve ter dois turnos consecutivos do mesmo time', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Guardiões do Cinema', ['A1', 'A2', 'A3', 'A4'], 0),
        createTeam('team-b', 'Absolute Cinema', ['B1', 'B2', 'B3'], 1),
        createTeam('team-c', 'Darth Apperol', ['C1', 'C2', 'C3'], 2),
      ]

      const sequence = createAlternatingTurnSequence(teams)
      const teamIds = getTeamIdFromParticipant(sequence, teams)

      expect(hasConsecutiveSameTeam(teamIds)).toBe(false)
    })
  })

  describe('Cenário: 3 times (4-4-4 jogadores)', () => {
    it('deve alternar corretamente entre times com mesmo número de membros', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Time A', ['A1', 'A2', 'A3', 'A4'], 0),
        createTeam('team-b', 'Time B', ['B1', 'B2', 'B3', 'B4'], 1),
        createTeam('team-c', 'Time C', ['C1', 'C2', 'C3', 'C4'], 2),
      ]

      const sequence = createAlternatingTurnSequence(teams)
      const teamIds = getTeamIdFromParticipant(sequence, teams)

      expect(sequence.length).toBe(12)
      expect(sequence).toEqual(['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3', 'A4', 'B4', 'C4'])
      expect(hasConsecutiveSameTeam(teamIds)).toBe(false)
    })

    it('nunca deve ter dois turnos consecutivos do mesmo time', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Time A', ['A1', 'A2', 'A3', 'A4'], 0),
        createTeam('team-b', 'Time B', ['B1', 'B2', 'B3', 'B4'], 1),
        createTeam('team-c', 'Time C', ['C1', 'C2', 'C3', 'C4'], 2),
      ]

      const sequence = createAlternatingTurnSequence(teams)
      const teamIds = getTeamIdFromParticipant(sequence, teams)

      expect(hasConsecutiveSameTeam(teamIds)).toBe(false)
    })
  })

  describe('Cenário: 2 times (4-3 jogadores)', () => {
    it('deve alternar corretamente entre 2 times', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Time A', ['A1', 'A2', 'A3', 'A4'], 0),
        createTeam('team-b', 'Time B', ['B1', 'B2', 'B3'], 1),
      ]

      const sequence = createAlternatingTurnSequence(teams)
      const teamIds = getTeamIdFromParticipant(sequence, teams)

      expect(sequence.length).toBe(7)
      expect(sequence).toEqual(['A1', 'B1', 'A2', 'B2', 'A3', 'B3', 'A4'])
      expect(hasConsecutiveSameTeam(teamIds)).toBe(false)
    })

    it('nunca deve ter dois turnos consecutivos do mesmo time', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Time A', ['A1', 'A2', 'A3', 'A4'], 0),
        createTeam('team-b', 'Time B', ['B1', 'B2', 'B3'], 1),
      ]

      const sequence = createAlternatingTurnSequence(teams)
      const teamIds = getTeamIdFromParticipant(sequence, teams)

      expect(hasConsecutiveSameTeam(teamIds)).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('deve retornar array vazio se não houver times', () => {
      const teams: TriviaTeam[] = []
      const sequence = createAlternatingTurnSequence(teams)
      expect(sequence).toEqual([])
    })

    it('deve retornar sequência linear se houver apenas um time', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Time A', ['A1', 'A2', 'A3'], 0),
      ]

      const sequence = createAlternatingTurnSequence(teams)
      expect(sequence).toEqual(['A1', 'A2', 'A3'])
    })

    it('deve funcionar com times de tamanhos muito diferentes', () => {
      const teams: TriviaTeam[] = [
        createTeam('team-a', 'Time A', ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'], 0),
        createTeam('team-b', 'Time B', ['B1'], 1),
        createTeam('team-c', 'Time C', ['C1', 'C2'], 2),
      ]

      const sequence = createAlternatingTurnSequence(teams)
      const teamIds = getTeamIdFromParticipant(sequence, teams)

      expect(sequence.length).toBe(9)
      // Quando apenas um time resta, ele pode ter turnos consecutivos (não há alternativa)
      // Mas antes disso, deve alternar corretamente
      const beforeLastTeam = teamIds.slice(0, -4) // Remove os últimos 4 (A3, A4, A5, A6)
      expect(hasConsecutiveSameTeam(beforeLastTeam)).toBe(false)
      expect(sequence).toEqual(['A1', 'B1', 'C1', 'A2', 'C2', 'A3', 'A4', 'A5', 'A6'])
    })
  })

  describe('Validação geral de alternância', () => {
    it('nunca deve ter dois turnos consecutivos do mesmo time em cenários balanceados', () => {
      const testCases = [
        {
          name: '3 times (4-3-3)',
          teams: [
            createTeam('team-a', 'Time A', ['A1', 'A2', 'A3', 'A4'], 0),
            createTeam('team-b', 'Time B', ['B1', 'B2', 'B3'], 1),
            createTeam('team-c', 'Time C', ['C1', 'C2', 'C3'], 2),
          ],
        },
        {
          name: '3 times (4-4-4)',
          teams: [
            createTeam('team-a', 'Time A', ['A1', 'A2', 'A3', 'A4'], 0),
            createTeam('team-b', 'Time B', ['B1', 'B2', 'B3', 'B4'], 1),
            createTeam('team-c', 'Time C', ['C1', 'C2', 'C3', 'C4'], 2),
          ],
        },
        {
          name: '2 times (4-3)',
          teams: [
            createTeam('team-a', 'Time A', ['A1', 'A2', 'A3', 'A4'], 0),
            createTeam('team-b', 'Time B', ['B1', 'B2', 'B3'], 1),
          ],
        },
        // Caso 2 times (3-4) pode ter turnos consecutivos quando um time termina
        // (não há alternativa quando apenas um time resta)
        {
          name: '4 times (2-2-2-2)',
          teams: [
            createTeam('team-a', 'Time A', ['A1', 'A2'], 0),
            createTeam('team-b', 'Time B', ['B1', 'B2'], 1),
            createTeam('team-c', 'Time C', ['C1', 'C2'], 2),
            createTeam('team-d', 'Time D', ['D1', 'D2'], 3),
          ],
        },
      ]

      testCases.forEach(({ name, teams }) => {
        const sequence = createAlternatingTurnSequence(teams)
        const teamIds = getTeamIdFromParticipant(sequence, teams)
        
        // Para cenários balanceados, nunca deve haver turnos consecutivos
        if (hasConsecutiveSameTeam(teamIds)) {
          console.log(`Falha no caso: ${name}`)
          console.log('Sequência:', sequence)
          console.log('Team IDs:', teamIds)
        }
        expect(hasConsecutiveSameTeam(teamIds)).toBe(false)
      })
    })
  })
})

