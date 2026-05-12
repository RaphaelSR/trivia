import type { MimicaScore, TriviaColumn, TriviaParticipant, TriviaTeam } from '../../trivia/types'

export type TeamScoreboardEntry = {
  team: TriviaTeam
  position: number
  points: number
}

export type ParticipantScoreBreakdown = {
  participant: TriviaParticipant
  points: number
  triviaPoints: number
  mimicaPoints: number
}

export function buildTeamScoreboard(teams: TriviaTeam[]): TeamScoreboardEntry[] {
  return [...teams]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((team, index) => ({
      team,
      position: index + 1,
      points: team.score || 0,
    }))
}

export function buildParticipantScoreBreakdown(
  team: TriviaTeam,
  participants: TriviaParticipant[],
  board: TriviaColumn[],
  mimicaScores: MimicaScore[] = [],
): ParticipantScoreBreakdown[] {
  const tiles = board.flatMap((column) => column.tiles)

  return team.members.flatMap((memberId) => {
    const participant = participants.find((item) => item.id === memberId)
    if (!participant) {
      return []
    }

    const triviaPoints = tiles
      .filter((tile) => tile.answeredBy?.participantId === memberId)
      .reduce((sum, tile) => sum + (tile.answeredBy?.pointsAwarded || 0), 0)

    const mimicaPoints = mimicaScores
      .filter((score) => score.participantId === memberId)
      .reduce((sum, score) => sum + score.pointsAwarded, 0)

    return [
      {
        participant,
        points: triviaPoints + mimicaPoints,
        triviaPoints,
        mimicaPoints,
      },
    ]
  })
}
