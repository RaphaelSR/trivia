import { createAlternatingTurnSequence } from '../../trivia/utils/createAlternatingTurnSequence'
import { createBalancedTurnSequence } from '../../trivia/utils/createBalancedTurnSequence'
import type { TriviaParticipant, TriviaSession, TriviaTeam } from '../../trivia/types'
import { countTotalTiles } from './board.utils'

export function buildTurnSequence(teams: TriviaTeam[], totalQuestions: number): string[] {
  if (totalQuestions > 0) {
    return createBalancedTurnSequence(teams, totalQuestions)
  }

  return createAlternatingTurnSequence(teams)
}

export function getNextTurnState(session: TriviaSession): {
  turnSequence: string[]
  activeParticipantId: string | null
  activeTeamId: string
} {
  const sequence = session.turnSequence

  if (!sequence.length) {
    return {
      turnSequence: sequence,
      activeParticipantId: session.activeParticipantId,
      activeTeamId: session.activeTeamId,
    }
  }

  const currentIndex = session.activeParticipantId ? sequence.indexOf(session.activeParticipantId) : -1
  const isWrappingAround = currentIndex === sequence.length - 1
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % sequence.length

  let nextSequence = sequence
  let nextParticipantId = sequence[nextIndex] ?? null

  if (isWrappingAround && session.teams.length > 1) {
    const sortedTeams = [...session.teams].sort((a, b) => a.order - b.order)
    const lastParticipant = session.participants.find((participant) => participant.id === sequence[sequence.length - 1])
    const totalQuestions = countTotalTiles(session.board)
    const regeneratedSequence = buildTurnSequence(sortedTeams, totalQuestions)
    nextSequence = rotateAwayFromTeam(regeneratedSequence, session.participants, lastParticipant?.teamId)
    nextParticipantId = nextSequence[0] ?? nextParticipantId
  }

  const nextParticipant = session.participants.find((participant) => participant.id === nextParticipantId)

  return {
    turnSequence: nextSequence,
    activeParticipantId: nextParticipantId,
    activeTeamId: nextParticipant?.teamId ?? session.activeTeamId,
  }
}

function rotateAwayFromTeam(
  sequence: string[],
  participants: TriviaParticipant[],
  previousTeamId?: string,
): string[] {
  if (!sequence.length || !previousTeamId) {
    return sequence
  }

  const firstParticipant = participants.find((participant) => participant.id === sequence[0])
  if (firstParticipant?.teamId !== previousTeamId) {
    return sequence
  }

  const differentIndex = sequence.findIndex((participantId) => {
    const participant = participants.find((item) => item.id === participantId)
    return participant?.teamId !== previousTeamId
  })

  if (differentIndex <= 0) {
    return sequence
  }

  return [...sequence.slice(differentIndex), ...sequence.slice(0, differentIndex)]
}
