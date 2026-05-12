import { createSessionForMode, rebuildSessionTurnState, syncTurnSequenceWithBoard } from '@/modules/game/domain/session'
import type { TriviaSession, TriviaTeam, TriviaParticipant } from '@/modules/trivia/types'

describe('session domain', () => {
  it('creates empty session for offline and online modes', () => {
    expect(createSessionForMode('offline').teams).toEqual([])
    expect(createSessionForMode('online').teams).toEqual([])
    expect(createSessionForMode('demo').teams.length).toBeGreaterThan(0)
  })

  it('creates a configurable demo session with the requested scale', () => {
    const demoSession = createSessionForMode('demo', {
      teamCount: 4,
      membersPerTeam: 4,
      questionCount: 18,
    })

    expect(demoSession.teams).toHaveLength(4)
    expect(demoSession.participants).toHaveLength(16)
    expect(demoSession.board.reduce((total, column) => total + column.tiles.length, 0)).toBe(18)
    expect(demoSession.turnSequence).toHaveLength(18)
    expect(demoSession.teams.every((team) => team.members.length === 4)).toBe(true)
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
      activeTurnIndex: 0,
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
    expect(rebuilt.activeTurnIndex).toBe(0)
  })

  it('syncs the turn sequence when the board grows without resetting current progress', () => {
    const teams: TriviaTeam[] = [
      { id: 'team-a', name: 'A', color: '#000', order: 0, members: ['a1', 'a2', 'a3', 'a4'], score: 0 },
      { id: 'team-b', name: 'B', color: '#111', order: 1, members: ['b1', 'b2', 'b3', 'b4', 'b5'], score: 0 },
      { id: 'team-c', name: 'C', color: '#222', order: 2, members: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'], score: 0 },
    ]
    const participants: TriviaParticipant[] = teams.flatMap((team) =>
      team.members.map((memberId) => ({
        id: memberId,
        name: memberId.toUpperCase(),
        role: 'player',
        teamId: team.id,
      })),
    )
    const session: TriviaSession = {
      id: 'session-1',
      title: 'Trivia',
      scheduledAt: new Date().toISOString(),
      theme: {
        id: 'default-dark',
        name: 'Tema Escuro',
        palette: { background: '#000', primary: '#111', secondary: '#222', accent: '#333', surface: '#444' },
      },
      teams,
      participants,
      board: [
        {
          id: 'col-1',
          filmId: 'film-1',
          film: 'Film 1',
          tiles: Array.from({ length: 10 }, (_, index) => ({
            id: `tile-${index + 1}`,
            film: 'Film 1',
            points: 10,
            state: 'available' as const,
            question: `Q${index + 1}`,
            answer: `A${index + 1}`,
          })),
        },
      ],
      activeTeamId: 'team-a',
      activeParticipantId: 'a4',
      activeTurnIndex: 9,
      turnSequence: ['a1', 'b1', 'c1', 'a2', 'b2', 'c2', 'a3', 'b3', 'c3', 'a4'],
      mimicaScores: [],
    }

    const synced = syncTurnSequenceWithBoard(session, [
      {
        id: 'col-1',
        filmId: 'film-1',
        film: 'Film 1',
        tiles: Array.from({ length: 18 }, (_, index) => ({
          id: `tile-${index + 1}`,
          film: 'Film 1',
          points: 10,
          state: 'available' as const,
          question: `Q${index + 1}`,
          answer: `A${index + 1}`,
        })),
      },
    ])

    expect(synced.activeParticipantId).toBe('a4')
    expect(synced.activeTurnIndex).toBe(9)
    expect(synced.turnSequence.slice(10, 18)).toEqual([
      'b4', 'c4', 'a1', 'b5', 'c5', 'a2', 'b1', 'c6',
    ])
  })
})
