import type { DemoSessionConfig, GameMode } from '../../../shared/types/game'
import type { TriviaColumn, TriviaParticipant, TriviaSession, TriviaTeam } from '../../trivia/types'
import { createEmptySession } from '../../trivia/utils/createEmptySession'
import { createLocalSession } from '../../trivia/utils/createLocalSession'
import { buildTurnSequence, resolveTurnIndex } from './turn-order'
import { countTotalTiles, dedupeTileIds } from './board.utils'

export function createSessionForMode(gameMode: GameMode, demoConfig?: DemoSessionConfig): TriviaSession {
  switch (gameMode) {
    case 'offline':
    case 'online':
      return createEmptySession()
    case 'demo':
    default:
      return createLocalSession(demoConfig)
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
    activeTurnIndex: activeParticipantId ? 0 : 0,
    activeParticipantId,
    activeTeamId,
  }
}

export function restorePersistedSession(session: TriviaSession | null, gameMode: GameMode): TriviaSession {
  if (!session) {
    return createSessionForMode(gameMode)
  }

  // Cura sessões com tiles de id duplicado (bug do import em massa) antes de
  // entrar no estado — assim um F5 conserta a partida sem perder nada.
  const healed = dedupeTileIds(session)

  return {
    ...healed,
    activeTurnIndex: healed.activeTurnIndex ?? resolveTurnIndex(
      undefined,
      healed.activeParticipantId,
      healed.turnSequence,
    ),
  }
}

export function syncTurnSequenceWithBoard(session: TriviaSession, board: TriviaColumn[]): TriviaSession {
  const sortedTeams = [...session.teams].sort((a, b) => a.order - b.order)
  const nextTurnSequence = buildTurnSequence(sortedTeams, countTotalTiles(board))
  const currentIndex = resolveTurnIndex(
    session.activeTurnIndex,
    session.activeParticipantId,
    session.turnSequence,
  )
  let safeTurnIndex: number
  if (nextTurnSequence.length === 0) {
    safeTurnIndex = 0
  } else if (currentIndex !== -1) {
    // Caso normal: comportamento inalterado.
    safeTurnIndex = Math.min(currentIndex, nextTurnSequence.length - 1)
  } else {
    // O índice se perdeu (-1). Em vez de RESETAR a vez para o início (bug do
    // "ponteiro errado"), tenta preservar QUEM está jogando: reencontra o
    // participante ativo na nova sequência. Só cai em 0 se ele não existir mais.
    const preserved = session.activeParticipantId
      ? nextTurnSequence.indexOf(session.activeParticipantId)
      : -1
    safeTurnIndex = preserved === -1 ? 0 : preserved
  }
  const activeParticipantId = nextTurnSequence[safeTurnIndex] ?? null
  const activeTeamId =
    session.participants.find((participant) => participant.id === activeParticipantId)?.teamId ??
    sortedTeams[0]?.id ??
    session.activeTeamId

  return {
    ...session,
    board,
    turnSequence: nextTurnSequence,
    activeTurnIndex: safeTurnIndex,
    activeParticipantId,
    activeTeamId,
  }
}
