import { compareEventLogs, createSessionForMode, rebuildSessionTurnState, syncTurnSequenceWithBoard } from '@/modules/game/domain/session'
import type { GameEvent, TriviaSession, TriviaTeam, TriviaParticipant } from '@/modules/trivia/types'

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

  it('preserva o participante ativo quando o índice se perde, em vez de resetar para o início (T2)', () => {
    const teams: TriviaTeam[] = [
      { id: 'team-a', name: 'A', color: '#000', order: 0, members: ['a1', 'a2', 'a3', 'a4'], score: 0 },
      { id: 'team-b', name: 'B', color: '#111', order: 1, members: ['b1', 'b2', 'b3', 'b4', 'b5'], score: 0 },
      { id: 'team-c', name: 'C', color: '#222', order: 2, members: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'], score: 0 },
    ]
    const participants: TriviaParticipant[] = teams.flatMap((team) =>
      team.members.map((memberId) => ({ id: memberId, name: memberId.toUpperCase(), role: 'player', teamId: team.id })),
    )
    const session: TriviaSession = {
      id: 'session-x',
      title: 'Trivia',
      scheduledAt: new Date().toISOString(),
      theme: {
        id: 'default-dark',
        name: 'Tema Escuro',
        palette: { background: '#000', primary: '#111', secondary: '#222', accent: '#333', surface: '#444' },
      },
      teams,
      participants,
      board: [],
      activeTeamId: 'team-a',
      // a2 está jogando, mas a turnSequence antiga está vazia → resolveTurnIndex = -1.
      // Antes do fix isso resetava a vez para o índice 0 (a1).
      activeParticipantId: 'a2',
      activeTurnIndex: 0,
      turnSequence: [],
      mimicaScores: [],
    }

    const synced = syncTurnSequenceWithBoard(
      session,
      [
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
    )

    // Preservou a2 (e NÃO resetou para a1, que é o índice 0 da nova sequência).
    expect(synced.activeParticipantId).toBe('a2')
    expect(synced.turnSequence[synced.activeTurnIndex]).toBe('a2')
    expect(synced.activeTurnIndex).not.toBe(0)
    expect(synced.activeTeamId).toBe('team-a')
  })

  it('preserva o turno atual e inclui participante novo apenas na ordem futura (times 1/2/3)', () => {
    const teams: TriviaTeam[] = [
      { id: 'team-a', name: 'A', color: '#000', order: 0, members: ['a1'], score: 0 },
      { id: 'team-b', name: 'B', color: '#111', order: 1, members: ['b1', 'b2'], score: 0 },
      { id: 'team-c', name: 'C', color: '#222', order: 2, members: ['c1', 'c2', 'c3'], score: 0 },
    ]
    const participants: TriviaParticipant[] = teams.flatMap(team =>
      team.members.map(id => ({ id, name: id.toUpperCase(), role: 'player', teamId: team.id }))
    )
    const sequence = ['a1', 'b1', 'c1', 'a1', 'b2', 'c2', 'a1', 'b1', 'c3', 'a1', 'b2', 'c1']
    const session: TriviaSession = {
      id: 'session-roster-change',
      title: 'Trivia',
      scheduledAt: new Date().toISOString(),
      theme: {
        id: 'default-dark',
        name: 'Tema Escuro',
        palette: { background: '#000', primary: '#111', secondary: '#222', accent: '#333', surface: '#444' },
      },
      teams,
      participants,
      board: [{
        id: 'column',
        filmId: 'film',
        film: 'Film',
        tiles: Array.from({ length: 12 }, (_, index) => ({
          id: `tile-${index}`,
          film: 'Film',
          points: 10,
          state: index < 4 ? 'answered' as const : 'available' as const,
          question: `Q${index}`,
          answer: `A${index}`,
        })),
      }],
      activeTeamId: 'team-b',
      activeParticipantId: 'b2',
      activeTurnIndex: 4,
      turnSequence: sequence,
      mimicaScores: [],
    }

    const updatedTeams = teams.map(team =>
      team.id === 'team-b' ? { ...team, members: [...team.members, 'b3'] } : team
    )
    const updatedParticipants = [
      ...participants,
      { id: 'b3', name: 'B3', role: 'player' as const, teamId: 'team-b' },
    ]
    const rebuilt = rebuildSessionTurnState(session, updatedTeams, updatedParticipants)

    expect(rebuilt.turnSequence.slice(0, 5)).toEqual(sequence.slice(0, 5))
    expect(rebuilt.activeParticipantId).toBe('b2')
    expect(rebuilt.activeTurnIndex).toBe(4)
    expect(rebuilt.turnSequence.slice(5, 9)).toEqual(['c2', 'a1', 'b3', 'c3'])
  })
})

describe('compareEventLogs', () => {
  const makeEvents = (ids: string[]): GameEvent[] =>
    ids.map((id) => ({
      id,
      type: 'trivia-award',
      timestamp: '2026-01-01T00:00:00.000Z',
      source: 'trivia',
      pointsAwarded: 10,
      teamId: 'team-1',
    }))

  it('returns equal for identical logs (including both empty)', () => {
    expect(compareEventLogs([], [])).toBe('equal')
    expect(compareEventLogs(makeEvents(['a', 'b']), makeEvents(['a', 'b']))).toBe('equal')
  })

  it('returns first-ahead when the first contains the second as prefix', () => {
    expect(compareEventLogs(makeEvents(['a', 'b', 'c']), makeEvents(['a', 'b']))).toBe('first-ahead')
    expect(compareEventLogs(makeEvents(['a']), [])).toBe('first-ahead')
  })

  it('returns second-ahead when the second contains the first as prefix', () => {
    expect(compareEventLogs(makeEvents(['a']), makeEvents(['a', 'b']))).toBe('second-ahead')
    expect(compareEventLogs([], makeEvents(['a']))).toBe('second-ahead')
  })

  it('returns diverged when histories differ within the common prefix', () => {
    expect(compareEventLogs(makeEvents(['a', 'x']), makeEvents(['a', 'y']))).toBe('diverged')
    expect(compareEventLogs(makeEvents(['x']), makeEvents(['y', 'z']))).toBe('diverged')
  })
})
