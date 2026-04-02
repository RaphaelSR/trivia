import { createSessionForMode, rebuildSessionTurnState } from '@/modules/game/domain/session'
import type { TriviaSession, TriviaTeam, TriviaParticipant } from '@/modules/trivia/types'

describe('session domain', () => {
  it('creates empty session for offline and online modes', () => {
    expect(createSessionForMode('offline').teams).toEqual([])
    expect(createSessionForMode('online').teams).toEqual([])
    expect(createSessionForMode('demo').teams.length).toBeGreaterThan(0)
  })

  it('rebuilds active turn from teams and participants', () => {
    const session: TriviaSession = {
      id: 'session-1',
      title: 'Trivia',
      scheduledAt: new Date().toISOString(),
      theme: {
        id: 'default-dark',
        name: 'Tema Escuro',
        palette: { background: '#000', primary: '#111', secondary: '#222', accent: '#333', surface: '#444' },
      },
      teams: [],
      participants: [],
      board: [],
      activeTeamId: '',
      activeParticipantId: null,
      turnSequence: [],
      mimicaScores: [],
    }

    const teams: TriviaTeam[] = [
      { id: 'team-1', name: 'A', color: '#000', order: 0, members: ['p1'], score: 0 },
    ]
    const participants: TriviaParticipant[] = [
      { id: 'p1', name: 'Jogador 1', role: 'player', teamId: 'team-1' },
    ]

    const rebuilt = rebuildSessionTurnState(session, teams, participants)
    expect(rebuilt.activeParticipantId).toBe('p1')
    expect(rebuilt.activeTeamId).toBe('team-1')
  })
})
