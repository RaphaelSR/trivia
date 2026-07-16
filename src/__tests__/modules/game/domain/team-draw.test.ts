import { canDrawTeamsBeforePlay, drawBalancedGroups } from '@/modules/game/domain/team-draw'
import type { TriviaSession } from '@/modules/trivia/types'

function session(overrides: Partial<TriviaSession> = {}): TriviaSession {
  return {
    id: 'session-1',
    title: 'Teste',
    scheduledAt: new Date(0).toISOString(),
    theme: {
      id: 'light',
      name: 'Claro',
      palette: {
        background: '#fff', primary: '#000', secondary: '#333', accent: '#555', surface: '#eee',
      },
    },
    teams: [],
    participants: [],
    board: [],
    activeTeamId: '',
    activeParticipantId: null,
    activeTurnIndex: 0,
    turnSequence: [],
    mimicaScores: [],
    eventLog: [],
    ...overrides,
  }
}

describe('team draw domain', () => {
  it('redistribui um elenco 1/2/3 em três times 2/2/2 sem perder ninguém', () => {
    const people = ['A1', 'B1', 'B2', 'C1', 'C2', 'C3']
    const randomValues = [0.12, 0.82, 0.31, 0.67, 0.45, 0.2]
    let index = 0

    const groups = drawBalancedGroups(people, 3, () => randomValues[index++] ?? 0)

    expect(groups.map((group) => group.length)).toEqual([2, 2, 2])
    expect(groups.flat().sort()).toEqual([...people].sort())
  })

  it('mantém diferença máxima de uma pessoa quando a divisão não é exata', () => {
    const groups = drawBalancedGroups(['1', '2', '3', '4', '5', '6', '7'], 3, () => 0.4)
    const sizes = groups.map((group) => group.length)
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
  })

  it('é determinístico quando recebe a mesma fonte aleatória', () => {
    const draw = () => {
      const values = [0.1, 0.7, 0.2, 0.8, 0.3]
      let index = 0
      return drawBalancedGroups(['a', 'b', 'c', 'd'], 2, () => values[index++] ?? 0)
    }
    expect(draw()).toEqual(draw())
  })

  it('permite o sorteio em sessão vazia ou apenas configurada', () => {
    expect(canDrawTeamsBeforePlay(session())).toBe(true)
    expect(canDrawTeamsBeforePlay(session({
      board: [{ id: 'c1', filmId: 'f1', film: 'Filme', tiles: [{
        id: 'q1', film: 'Filme', points: 1, question: 'Q', answer: 'A', state: 'available',
      }] }],
    }))).toBe(true)
  })

  it.each([
    ['tile ativa', { board: [{ id: 'c1', filmId: 'f1', film: 'F', tiles: [{ id: 'q1', film: 'F', points: 1, question: 'Q', answer: 'A', state: 'active' as const }] }] }],
    ['tile respondida', { board: [{ id: 'c1', filmId: 'f1', film: 'F', tiles: [{ id: 'q1', film: 'F', points: 1, question: 'Q', answer: 'A', state: 'answered' as const }] }] }],
    ['pontuação', { teams: [{ id: 't1', name: 'T', color: '#000', order: 0, members: ['p1'], score: 1 }] }],
    ['mímica', { mimicaScores: [{ id: 'm1', participantId: 'p1', teamId: 't1', pointsAwarded: 1, mode: 'full-current' as const, timestamp: new Date(0).toISOString(), turnNumber: 0, roundNumber: 1 }] }],
    ['evento', { eventLog: [{ id: 'e1', type: 'trivia-award' as const, source: 'trivia' as const, timestamp: new Date(0).toISOString(), pointsAwarded: 1, teamId: 't1' }] }],
  ])('bloqueia depois de %s', (_label, overrides) => {
    expect(canDrawTeamsBeforePlay(session(overrides as Partial<TriviaSession>))).toBe(false)
  })
})
