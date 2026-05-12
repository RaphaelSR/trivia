import {
  buildTurnPreviewGroups,
  buildTurnSequence,
  getCompleteRoundLabel,
  getCompleteRoundNumber,
  getNextTurnState,
  getRecommendedPreviewTurnCount,
  getTurnLabel,
} from '@/modules/game/domain/turn-order'
import type { TriviaSession, TriviaTeam } from '@/modules/trivia/types'

const teams: TriviaTeam[] = [
  { id: 'team-1', name: 'A', color: '#000', order: 0, members: ['a1', 'a2'], score: 0 },
  { id: 'team-2', name: 'B', color: '#fff', order: 1, members: ['b1', 'b2'], score: 0 },
]

const unevenTeams: TriviaTeam[] = [
  { id: 'team-a', name: 'Equipe A', color: '#a00', order: 0, members: ['a1', 'a2', 'a3', 'a4'], score: 0 },
  { id: 'team-b', name: 'Equipe B', color: '#0a0', order: 1, members: ['b1', 'b2', 'b3', 'b4', 'b5'], score: 0 },
  { id: 'team-c', name: 'Equipe C', color: '#00a', order: 2, members: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'], score: 0 },
]

function createTeamsFromSizes(sizes: number[]): TriviaTeam[] {
  return sizes.map((size, teamIndex) => {
    const teamLabel = String.fromCharCode(65 + teamIndex)
    return {
      id: `team-${teamLabel.toLowerCase()}`,
      name: `Equipe ${teamLabel}`,
      color: `#${teamIndex}${teamIndex}${teamIndex}`,
      order: teamIndex,
      members: Array.from({ length: size }, (_, memberIndex) => `${teamLabel.toLowerCase()}${memberIndex + 1}`),
      score: 0,
    }
  })
}

function createBoard(totalTiles: number) {
  return [
    {
      id: 'col-1',
      filmId: 'film-1',
      film: 'Film 1',
      tiles: Array.from({ length: totalTiles }, (_, index) => ({
        id: `tile-${index + 1}`,
        film: 'Film 1',
        points: (index + 1) * 5,
        state: 'available' as const,
        question: `Q${index + 1}`,
        answer: `A${index + 1}`,
      })),
    },
  ]
}

function createParticipantsFromTeams(sourceTeams: TriviaTeam[]) {
  return sourceTeams.flatMap((team) =>
    team.members.map((memberId) => ({
      id: memberId,
      name: memberId.toUpperCase(),
      role: 'player' as const,
      teamId: team.id,
    })),
  )
}

function expectBalancedTeamCycle(sequence: string[], sourceTeams: TriviaTeam[]) {
  const teamByParticipantId = new Map<string, TriviaTeam>()
  const seenTurnsPerTeam = new Map<string, number>()

  sourceTeams.forEach((team) => {
    seenTurnsPerTeam.set(team.id, 0)
    team.members.forEach((memberId) => {
      teamByParticipantId.set(memberId, team)
    })
  })

  sequence.forEach((participantId, index) => {
    const team = teamByParticipantId.get(participantId)

    expect(team).toBeDefined()
    expect(team?.id).toBe(sourceTeams[index % sourceTeams.length].id)

    const seenTurns = seenTurnsPerTeam.get(team!.id) ?? 0
    const expectedParticipantId = team!.members[seenTurns % team!.members.length]

    expect(participantId).toBe(expectedParticipantId)
    seenTurnsPerTeam.set(team!.id, seenTurns + 1)
  })
}

describe('turn-order domain', () => {
  it('builds alternating sequence without questions', () => {
    expect(buildTurnSequence(teams, 0)).toEqual(['a1', 'b1', 'a2', 'b2'])
  })

  it('builds the expected balanced sequence for 3 teams (4-5-6) over 18 turns', () => {
    expect(buildTurnSequence(unevenTeams, 18)).toEqual([
      'a1', 'b1', 'c1',
      'a2', 'b2', 'c2',
      'a3', 'b3', 'c3',
      'a4', 'b4', 'c4',
      'a1', 'b5', 'c5',
      'a2', 'b1', 'c6',
    ])
  })

  it.each([
    { sizes: [4, 5, 6], totalQuestions: 18 },
    { sizes: [4, 5, 6], totalQuestions: 36 },
    { sizes: [3, 3, 5], totalQuestions: 21 },
    { sizes: [2, 4, 6], totalQuestions: 24 },
    { sizes: [1, 5, 6], totalQuestions: 18 },
    { sizes: [2, 3, 4, 5], totalQuestions: 28 },
  ])(
    'preserves alternation and internal participant order for team sizes $sizes over $totalQuestions turns',
    ({ sizes, totalQuestions }) => {
      const sizedTeams = createTeamsFromSizes(sizes)
      const sequence = buildTurnSequence(sizedTeams, totalQuestions)

      expect(sequence).toHaveLength(totalQuestions)
      expectBalancedTeamCycle(sequence, sizedTeams)
    },
  )

  it('formats the current turn label', () => {
    expect(getTurnLabel('b1', ['a1', 'b1', 'a2'])).toBe('2 de 3')
    expect(getTurnLabel(null, ['a1'])).toBe('Aguardando sequência')
    expect(getTurnLabel('missing', ['a1'])).toBe('Aguardando sequência')
  })

  it('counts a round only after everyone appears at least once', () => {
    const sequence = buildTurnSequence(unevenTeams, 36)
    const participants = createParticipantsFromTeams(unevenTeams)

    expect(getCompleteRoundNumber(sequence[17], sequence, unevenTeams, participants, 17)).toBe(1)
    expect(getCompleteRoundNumber(sequence[18], sequence, unevenTeams, participants, 18)).toBe(2)
    expect(getCompleteRoundLabel(sequence[18], sequence, unevenTeams, participants, 18)).toBe('Rodada 2')
  })

  it('builds preview groups by complete round and flags repeats before the group closes', () => {
    const groups = buildTurnPreviewGroups(
      unevenTeams,
      createParticipantsFromTeams(unevenTeams),
      18,
    )

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      label: 'Rodada 1',
      isPartial: false,
    })
    expect(groups[0]?.entries).toHaveLength(18)
    expect(groups[0]?.entries[12]).toMatchObject({
      participantId: 'a1',
      repeatedInGroup: true,
    })
    expect(groups[0]?.entries[17]).toMatchObject({
      participantId: 'c6',
      repeatedInGroup: false,
    })
  })

  it('recommends enough turns to explain two complete rounds for uneven teams', () => {
    expect(getRecommendedPreviewTurnCount(unevenTeams, 2)).toBe(36)
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
      activeTurnIndex: 3,
      turnSequence: ['a1', 'b1', 'a2', 'b2'],
      mimicaScores: [],
    }

    const nextState = getNextTurnState(session)
    expect(nextState.activeParticipantId).toBeTruthy()
    expect(nextState.activeTeamId).toBe('team-1')
  })

  it('keeps participant order when a shorter stale sequence wraps after the board has grown', () => {
    const session: TriviaSession = {
      id: 'session-uneven',
      title: 'Uneven teams',
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
      teams: unevenTeams,
      participants: createParticipantsFromTeams(unevenTeams),
      board: createBoard(18),
      activeTeamId: 'team-a',
      activeParticipantId: 'a4',
      activeTurnIndex: 9,
      turnSequence: buildTurnSequence(unevenTeams, 10),
      mimicaScores: [],
    }

    const observedAfterWrap: Array<string | null> = []
    let currentSession = session

    for (let index = 0; index < 8; index++) {
      const nextState = getNextTurnState(currentSession)
      observedAfterWrap.push(nextState.activeParticipantId)
      currentSession = {
        ...currentSession,
        ...nextState,
      }
    }

    expect(observedAfterWrap).toEqual([
      'b4', 'c4', 'a1', 'b5', 'c5', 'a2', 'b1', 'c6',
    ])
  })

  it('advances from a repeated participant occurrence using the current turn index', () => {
    const fullSequence = buildTurnSequence(unevenTeams, 18)
    const session: TriviaSession = {
      id: 'session-repeated',
      title: 'Repeated participant',
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
      teams: unevenTeams,
      participants: createParticipantsFromTeams(unevenTeams),
      board: createBoard(18),
      activeTeamId: 'team-a',
      activeParticipantId: 'a1',
      activeTurnIndex: 12,
      turnSequence: fullSequence,
      mimicaScores: [],
    }

    const nextState = getNextTurnState(session)

    expect(nextState.activeParticipantId).toBe('b5')
    expect(nextState.activeTurnIndex).toBe(13)
    expect(nextState.activeTeamId).toBe('team-b')
  })
})
