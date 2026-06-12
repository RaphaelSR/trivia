import type { TriviaParticipant, TriviaSession, TriviaTeam } from '@/modules/trivia/types'
import { buildTurnSequence } from '@/modules/game/domain/turn-order'

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export function createTeamsFromSizes(sizes: number[]): TriviaTeam[] {
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

export function createBoard(totalTiles: number) {
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

export function createParticipantsFromTeams(sourceTeams: TriviaTeam[]): TriviaParticipant[] {
  return sourceTeams.flatMap((team) =>
    team.members.map((memberId) => ({
      id: memberId,
      name: memberId.toUpperCase(),
      role: 'player' as const,
      teamId: team.id,
    })),
  )
}

export function expectBalancedTeamCycle(sequence: string[], sourceTeams: TriviaTeam[]) {
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

export const defaultTheme: TriviaSession['theme'] = {
  id: 'default-dark',
  name: 'Tema Escuro',
  palette: {
    background: '#000',
    primary: '#111',
    secondary: '#222',
    accent: '#333',
    surface: '#444',
  },
}

/**
 * makeSession — constrói uma TriviaSession mínima a partir de times e totalTiles.
 * @param teams - times já criados (usar createTeamsFromSizes)
 * @param totalTiles - tamanho do board (também define turnSequence via buildTurnSequence)
 * @param overrides - campos a sobrescrever depois de montar a base
 */
export function makeSession(
  teams: TriviaTeam[],
  totalTiles: number,
  overrides: Partial<TriviaSession> = {},
): TriviaSession {
  const participants = createParticipantsFromTeams(teams)
  const sequence = buildTurnSequence(teams, totalTiles)
  return {
    id: 'session-test',
    title: 'Test Session',
    scheduledAt: new Date().toISOString(),
    theme: defaultTheme,
    teams,
    participants,
    board: createBoard(totalTiles),
    activeTeamId: teams[0]?.id ?? '',
    activeParticipantId: null,
    activeTurnIndex: -1,
    turnSequence: sequence,
    mimicaScores: [],
    ...overrides,
  }
}
