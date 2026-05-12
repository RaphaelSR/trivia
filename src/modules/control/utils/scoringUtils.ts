import type { TriviaParticipant } from '@/modules/trivia/types'
import type { PointDistribution, QuickScoringOption } from '../types/control.types'
import {
  calculateFlexibleScorePercentage,
  createFlexibleScoreDistribution,
  resolveFlexibleScorePoints,
  type FlexibleScoreValue,
} from '@/modules/game/domain/scoring'

/**
 * Calcula pontos baseado em multiplicador
 */
export function calculatePoints(basePoints: number, multiplier: number): number {
  return resolveFlexibleScorePoints(basePoints, {
    kind: 'multiplier',
    multiplier,
  })
}

/**
 * Calcula porcentagem de pontos
 */
export function calculatePercentage(points: number, basePoints: number): number {
  return calculateFlexibleScorePercentage(points, basePoints)
}

function normalizeDistribution(
  distribution: PointDistribution,
  basePoints: number
): PointDistribution {
  return {
    ...distribution,
    percentage: calculatePercentage(distribution.points, basePoints),
  }
}

function getOptionScoringValue(option: QuickScoringOption): FlexibleScoreValue {
  if (option.scoringValue) {
    return option.scoringValue
  }

  if (option.target === 'none' || option.multiplier === 0) {
    return { kind: 'void' }
  }

  return {
    kind: 'multiplier',
    multiplier: option.multiplier,
  }
}

/**
 * Aplica uma opção rápida de pontuação e retorna distribuições
 */
export function applyQuickScoringOption(
  option: QuickScoringOption,
  basePoints: number,
  activeTeamId: string | null,
  activeParticipantId: string | null
): PointDistribution[] {
  const scoringValue = getOptionScoringValue(option)

  if (option.distributions && option.distributions.length > 0) {
    return option.distributions.flatMap((distribution) => {
      const teamId =
        distribution.target === 'current-team'
          ? activeTeamId
          : distribution.teamId

      if (!teamId) {
        return []
      }

      const recipientParticipantId =
        distribution.target === 'current-team'
          ? activeParticipantId || undefined
          : distribution.participantId

      const normalized = createFlexibleScoreDistribution({
        basePoints,
        recipient: {
          teamId,
          participantId: recipientParticipantId,
        },
        value: distribution.value ?? scoringValue,
      })

      return [normalized]
    })
  }

  switch (option.target) {
    case 'current-team':
      if (activeTeamId) {
        return [
          createFlexibleScoreDistribution({
            basePoints,
            recipient: {
              teamId: activeTeamId,
              participantId: activeParticipantId || undefined,
            },
            value: scoringValue,
          }),
        ]
      }
      return []
    case 'none':
      return []
    default:
      return []
  }
}

/**
 * Atualiza distribuição de pontos de um time
 */
export function updateTeamDistribution(
  distributions: PointDistribution[],
  teamId: string,
  points: number,
  options?: {
    participantId?: string
    valueKind?: FlexibleScoreValue['kind']
    suggested?: boolean
    basePoints?: number
  }
): PointDistribution[] {
  const filtered = distributions.filter(d => d.teamId !== teamId)
  if (points > 0) {
    const nextDistribution: PointDistribution = {
      teamId,
      participantId: options?.participantId,
      points,
      valueKind: options?.valueKind,
      suggested: options?.suggested,
    }

    if (typeof options?.basePoints === 'number') {
      return [...filtered, normalizeDistribution(nextDistribution, options.basePoints)]
    }

    return [...filtered, nextDistribution]
  }
  return filtered
}

/**
 * Filtra participantes por time
 */
export function getTeamParticipants(
  participants: TriviaParticipant[],
  teamId: string
): TriviaParticipant[] {
  return participants.filter(p => p.teamId === teamId)
}

/**
 * Valida se distribuições são válidas
 */
export function isValidScoring(
  mode: 'quick' | 'advanced' | 'custom',
  quickModeSelected: boolean,
  distributions: PointDistribution[]
): boolean {
  if (mode === 'quick') {
    return quickModeSelected
  }
  return distributions.length > 0
}
