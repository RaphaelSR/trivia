import type { TriviaTeam, TriviaParticipant } from '@/modules/trivia/types'
import type { PointDistribution, QuickScoringOption } from '../types/control.types'

/**
 * Calcula pontos baseado em multiplicador
 */
export function calculatePoints(basePoints: number, multiplier: number): number {
  return Math.round(basePoints * multiplier)
}

/**
 * Calcula porcentagem de pontos
 */
export function calculatePercentage(points: number, basePoints: number): number {
  return Math.round((points / basePoints) * 100)
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
  const points = calculatePoints(basePoints, option.multiplier)
  
  switch (option.target) {
    case 'current-team':
      if (activeTeamId) {
        return [{
          teamId: activeTeamId,
          participantId: activeParticipantId || undefined,
          points,
        }]
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
  points: number
): PointDistribution[] {
  const filtered = distributions.filter(d => d.teamId !== teamId)
  if (points > 0) {
    return [...filtered, { teamId, points }]
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
  mode: 'quick' | 'advanced',
  quickModeSelected: boolean,
  distributions: PointDistribution[]
): boolean {
  if (mode === 'quick') {
    return quickModeSelected
  }
  return distributions.length > 0
}

