import { buildTurnSequence, getNextTurnState } from '@/modules/game/domain/turn-order'
import type { TriviaSession, TriviaTeam } from '@/modules/trivia/types'

const teams: TriviaTeam[] = [
  { id: 'team-1', name: 'A', color: '#000', order: 0, members: ['a1', 'a2'], score: 0 },
  { id: 'team-2', name: 'B', color: '#fff', order: 1, members: ['b1', 'b2'], score: 0 },
]

describe('turn-order domain', () => {
  it('builds alternating sequence without questions', () => {
    expect(buildTurnSequence(teams, 0)).toEqual(['a1', 'b1', 'a2', 'b2'])
  })

  it('advances turn and preserves team alternation on wrap-around', () => {
    const session: TriviaSession = {
      id: 'session-1',
      title: 'Trivia',
      scheduledAt: new Date().toISOString(),
      theme: {
        id: 'default-dark',
        name: 'Tema Escuro',
        palette: {
          background: '#000',
          primary: '#111',
          secondary: '#222',
          accent: '#333',
          surface: '#444',
        },
      },
      teams,
      participants: [
        { id: 'a1', name: 'A1', role: 'player', teamId: 'team-1' },
        { id: 'a2', name: 'A2', role: 'player', teamId: 'team-1' },
        { id: 'b1', name: 'B1', role: 'player', teamId: 'team-2' },
        { id: 'b2', name: 'B2', role: 'player', teamId: 'team-2' },
      ],
      board: [
        {
          id: 'col-1',
          filmId: 'f1',
          film: 'Film 1',
          tiles: [
            { id: 'tile-1', film: 'Film 1', points: 10, state: 'available', question: 'Q1', answer: 'A1' },
            { id: 'tile-2', film: 'Film 1', points: 20, state: 'available', question: 'Q2', answer: 'A2' },
          ],
        },
      ],
      activeTeamId: 'team-2',
      activeParticipantId: 'b2',
      turnSequence: ['a1', 'b1', 'a2', 'b2'],
      mimicaScores: [],
    }

    const nextState = getNextTurnState(session)
    expect(nextState.activeParticipantId).toBeTruthy()
    expect(nextState.activeTeamId).toBe('team-1')
  })
})
