import type { TriviaTeam, TriviaParticipant, TriviaColumn } from '@/modules/trivia/types'
import { createAlternatingTurnSequence } from '@/modules/trivia/utils/createAlternatingTurnSequence'
import { createBalancedTurnSequence } from '@/modules/trivia/utils/createBalancedTurnSequence'

/**
 * Calcula total de perguntas no board
 */
export function calculateTotalQuestions(board: TriviaColumn[]): number {
  return board.reduce((acc, column) => acc + column.tiles.length, 0)
}

/**
 * Gera sequência de turnos baseada no board
 */
export function generateTurnSequence(
  teams: TriviaTeam[],
  board: TriviaColumn[]
): string[] {
  const totalQuestions = calculateTotalQuestions(board)
  
  if (totalQuestions > 0) {
    return createBalancedTurnSequence(teams, totalQuestions)
  }
  
  return createAlternatingTurnSequence(teams)
}

/**
 * Converte teamDrafts para TriviaTeam[]
 */
export function convertDraftsToTeams(
  teamDrafts: Array<{
    id: string
    name: string
    color: string
    members: Array<{
      id: string
      name: string
      role: TriviaParticipant['role']
    }>
  }>,
  existingTeams: TriviaTeam[]
): TriviaTeam[] {
  return teamDrafts.map((team, index) => ({
    id: team.id,
    name: team.name.trim() || `Time ${index + 1}`,
    color: team.color || 'var(--color-primary)',
    order: index,
    members: team.members.map((member) => member.id),
    score: existingTeams.find((t) => t.id === team.id)?.score || 0,
  }))
}

/**
 * Converte teamDrafts para TriviaParticipant[]
 */
export function convertDraftsToParticipants(
  teamDrafts: Array<{
    id: string
    members: Array<{
      id: string
      name: string
      role: TriviaParticipant['role']
    }>
  }>
): TriviaParticipant[] {
  return teamDrafts.flatMap((team) =>
    team.members.map((member) => ({
      id: member.id,
      name: member.name.trim() || 'Participante',
      role: member.role,
      teamId: team.id,
    }))
  )
}

