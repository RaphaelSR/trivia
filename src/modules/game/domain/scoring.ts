import type { MimicaScoringMode } from '../../../shared/types/game'
import type { MimicaScore } from '../../trivia/types'
import { createId } from '../../../shared/utils/id'

export function calculateMimicaPoints(
  basePoints: number,
  mode: MimicaScoringMode,
  teamsCount: number,
): number {
  switch (mode) {
    case 'full-current':
    case 'steal':
      return basePoints
    case 'half-current':
      return Math.round(basePoints / 2)
    case 'everyone':
      return teamsCount > 0 ? Math.round(basePoints / teamsCount) : 0
    case 'void':
      return 0
    default:
      return basePoints
  }
}

export function createMimicaScoreEntry(params: {
  participantId: string
  teamId: string
  pointsAwarded: number
  turnNumber: number
  roundNumber: number
  mode: MimicaScoringMode
  targetTeamId?: string
}): MimicaScore {
  return {
    id: createId('mimica'),
    participantId: params.participantId,
    teamId: params.teamId,
    pointsAwarded: params.pointsAwarded,
    timestamp: new Date().toISOString(),
    turnNumber: params.turnNumber,
    roundNumber: params.roundNumber,
    mode: params.mode,
    targetTeamId: params.targetTeamId,
  }
}
