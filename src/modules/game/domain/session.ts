import type { GameMode } from '../../../shared/types/game'
import type { TriviaParticipant, TriviaSession, TriviaTeam } from '../../trivia/types'
import { createEmptySession } from '../../trivia/utils/createEmptySession'
import { createLocalSession } from '../../trivia/utils/createLocalSession'
import { buildTurnSequence } from './turn-order'
import { countTotalTiles } from './board.utils'

export function createSessionForMode(gameMode: GameMode): TriviaSession {
  switch (gameMode) {
    case 'offline':
    case 'online':
      return createEmptySession()
    case 'demo':
    default:
      return createLocalSession()
  }
}

export function rebuildSessionTurnState(
  session: TriviaSession,
  teams: TriviaTeam[],
  participants: TriviaParticipant[],
  turnSequence?: string[],
): TriviaSession {
  const finalTurnSequence = turnSequence?.filter((id) =>
    participants.some((participant) => participant.id === id),
  ) ?? buildTurnSequence(teams, countTotalTiles(session.board))

  const activeParticipantId = finalTurnSequence[0] ?? null
  const activeTeamId =
    participants.find((participant) => participant.id === activeParticipantId)?.teamId ??
    teams[0]?.id ??
    session.activeTeamId

  return {
    ...session,
    teams,
    participants,
    turnSequence: finalTurnSequence,
    activeParticipantId,
    activeTeamId,
  }
}

export function restorePersistedSession(session: TriviaSession | null, gameMode: GameMode): TriviaSession {
  return session ?? createSessionForMode(gameMode)
}
