import type { MimicaScoringMode } from '../../../shared/types/game'
import type { MimicaScore } from '../../trivia/types'
import { createId } from '../../../shared/utils/id'

export type FlexibleScoreValue =
  | {
      kind: 'multiplier'
      multiplier: number
      suggested?: boolean
    }
  | {
      kind: 'fixed'
      points: number
      suggested?: boolean
    }
  | {
      kind: 'void'
      suggested?: boolean
    }

export type FlexibleScoreRecipient = {
  teamId: string
  participantId?: string
}

export type FlexibleScoreDistribution = FlexibleScoreRecipient & {
  points: number
  percentage: number
  valueKind: FlexibleScoreValue['kind']
  suggested: boolean
}

export function resolveFlexibleScorePoints(
  basePoints: number,
  value: FlexibleScoreValue,
): number {
  switch (value.kind) {
    case 'multiplier':
      return Math.round(basePoints * value.multiplier)
    case 'fixed':
      return Math.round(value.points)
    case 'void':
      return 0
    default:
      return 0
  }
}

export function calculateFlexibleScorePercentage(
  points: number,
  basePoints: number,
): number {
  if (basePoints === 0) {
    return 0
  }

  return Math.round((points / basePoints) * 100)
}

export function createFlexibleScoreDistribution(params: {
  basePoints: number
  recipient: FlexibleScoreRecipient
  value: FlexibleScoreValue
}): FlexibleScoreDistribution {
  const points = resolveFlexibleScorePoints(params.basePoints, params.value)

  return {
    teamId: params.recipient.teamId,
    participantId: params.recipient.participantId,
    points,
    percentage: calculateFlexibleScorePercentage(points, params.basePoints),
    valueKind: params.value.kind,
    suggested: params.value.suggested ?? false,
  }
}

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
