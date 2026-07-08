import type { DemoSessionConfig, GameMode } from '../../../shared/types/game'
import type { GameEvent, TriviaColumn, TriviaParticipant, TriviaSession, TriviaTeam } from '../../trivia/types'
import { createEmptySession } from '../../trivia/utils/createEmptySession'
import { createLocalSession } from '../../trivia/utils/createLocalSession'
import { buildTurnSequence, resolveTurnIndex } from './turn-order'
import { countTotalTiles, dedupeTileIds, releaseActiveTiles } from './board.utils'

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
    activeTurnIndex: 0,
    activeParticipantId,
    activeTeamId,
  }
}

export function restorePersistedSession(session: TriviaSession | null, gameMode: GameMode): TriviaSession {
  if (!session) {
    return createSessionForMode(gameMode)
  }

  // Curas antes de entrar no estado — assim um F5 conserta a partida sem
  // perder nada: ids duplicados (bug do import em massa) e cartas presas em
  // 'active' (F5 com o modal da pergunta aberto).
  const healed = releaseActiveTiles(dedupeTileIds(session))

  return {
    ...healed,
    activeTurnIndex: healed.activeTurnIndex ?? resolveTurnIndex(
      undefined,
      healed.activeParticipantId,
      healed.turnSequence,
    ),
  }
}

/**
 * Relação entre dois eventLogs append-only da mesma partida.
 * - 'equal'        : mesmos eventos, mesma ordem.
 * - 'first-ahead'  : o primeiro contém o segundo como prefixo (está à frente).
 * - 'second-ahead' : o segundo contém o primeiro como prefixo.
 * - 'diverged'     : as histórias divergem — nenhum é prefixo do outro.
 */
export type EventLogRelation = 'equal' | 'first-ahead' | 'second-ahead' | 'diverged'

/**
 * Compara dois eventLogs append-only pela relação de prefixo.
 *
 * Como o log NUNCA é sobrescrito, um log que contém o outro como prefixo está
 * estritamente à frente na mesma linha do tempo — uma revisão monotônica.
 * Isso decide local × nuvem sem depender de relógio (timestamps mentem quando
 * uma edição cosmética toca a cópia atrasada por último) nem de contagem de
 * cartas (empata quando as jogadas são diferentes).
 */
export function compareEventLogs(first: GameEvent[], second: GameEvent[]): EventLogRelation {
  const common = Math.min(first.length, second.length)
  for (let i = 0; i < common; i++) {
    if (first[i].id !== second[i].id) return 'diverged'
  }
  if (first.length === second.length) return 'equal'
  return first.length > second.length ? 'first-ahead' : 'second-ahead'
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
