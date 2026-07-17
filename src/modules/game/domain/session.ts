import type { DemoSessionConfig, GameMode } from '../../../shared/types/game'
import type { GameEvent, TriviaColumn, TriviaParticipant, TriviaSession, TriviaTeam } from '../../trivia/types'
import { createEmptySession } from '../../trivia/utils/createEmptySession'
import { createLocalSession } from '../../trivia/utils/createLocalSession'
import { buildTurnSequence, resolveTurnIndex } from './turn-order'
import { countAnsweredTiles, countTotalTiles, dedupeTileIds, releaseActiveTiles } from './board.utils'
import { upgradeLegacyCompleteSessionId } from './session-id'

export type SessionCreationCopy = {
  title?: string
  themeName?: string
  demoPlayer?: (number: number) => string
}

export function createSessionForMode(
  gameMode: GameMode,
  demoConfig?: DemoSessionConfig,
  copy?: SessionCreationCopy,
): TriviaSession {
  switch (gameMode) {
    case 'offline':
    case 'online':
      return createEmptySession(copy)
    case 'demo':
    default:
      return createLocalSession(demoConfig, copy)
  }
}

export function rebuildSessionTurnState(
  session: TriviaSession,
  teams: TriviaTeam[],
  participants: TriviaParticipant[],
  turnSequence?: string[],
): TriviaSession {
  const totalTurns = countTotalTiles(session.board)
  const filteredTurnSequence = turnSequence?.filter((id) =>
    participants.some((participant) => participant.id === id),
  ) ?? []
  const finalTurnSequence = totalTurns > 0 && filteredTurnSequence.length === totalTurns
    ? filteredTurnSequence
    : buildTurnSequence(teams, totalTurns)

  const currentIndex = resolveTurnIndex(
    session.activeTurnIndex,
    session.activeParticipantId,
    session.turnSequence,
  )
  const hasTriviaProgress = countAnsweredTiles(session.board) > 0 && currentIndex >= 0

  if (hasTriviaProgress && finalTurnSequence.length > 0) {
    return reconcileFutureTurnState(
      session,
      teams,
      participants,
      finalTurnSequence.length,
      currentIndex,
    )
  }

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

function reconcileFutureTurnState(
  session: TriviaSession,
  teams: TriviaTeam[],
  participants: TriviaParticipant[],
  totalTurns: number,
  currentIndex: number,
): TriviaSession {
  const participantIds = new Set(participants.map((participant) => participant.id))
  const activeParticipantStillExists = Boolean(
    session.activeParticipantId && participantIds.has(session.activeParticipantId),
  )
  const prefixEnd = activeParticipantStillExists ? currentIndex + 1 : currentIndex
  const preservedPrefix = session.turnSequence.slice(0, prefixEnd).slice(0, totalTurns)
  const futureTurns = Math.max(totalTurns - preservedPrefix.length, 0)
  const futureSequence = buildFairFutureSequence(
    teams,
    participants,
    session.participants,
    preservedPrefix,
    futureTurns,
  )
  const nextTurnSequence = [...preservedPrefix, ...futureSequence]

  const activeTurnIndex = activeParticipantStillExists
    ? Math.max(preservedPrefix.length - 1, 0)
    : Math.min(preservedPrefix.length, Math.max(nextTurnSequence.length - 1, 0))
  const activeParticipantId = nextTurnSequence[activeTurnIndex] ?? null
  const activeTeamId =
    participants.find((participant) => participant.id === activeParticipantId)?.teamId ??
    teams[0]?.id ??
    session.activeTeamId

  return {
    ...session,
    teams,
    participants,
    turnSequence: nextTurnSequence,
    activeTurnIndex,
    activeParticipantId,
    activeTeamId,
  }
}

function buildFairFutureSequence(
  teams: TriviaTeam[],
  participants: TriviaParticipant[],
  previousParticipants: TriviaParticipant[],
  preservedPrefix: string[],
  totalTurns: number,
): string[] {
  const participantIds = new Set(participants.map((participant) => participant.id))
  const playableTeams = [...teams]
    .sort((a, b) => a.order - b.order)
    .map((team) => ({
      ...team,
      members: team.members.filter((memberId) => participantIds.has(memberId)),
    }))
    .filter((team) => team.members.length > 0)

  if (!playableTeams.length || totalTurns <= 0) {
    return []
  }

  const teamByParticipant = new Map(
    [...previousParticipants, ...participants].map((participant) => [participant.id, participant.teamId]),
  )
  const appearances = new Map<string, number>()
  preservedPrefix.forEach((participantId) => {
    if (participantIds.has(participantId)) {
      appearances.set(participantId, (appearances.get(participantId) ?? 0) + 1)
    }
  })

  const lastParticipantId = preservedPrefix[preservedPrefix.length - 1]
  const lastTeamId = lastParticipantId ? teamByParticipant.get(lastParticipantId) : undefined
  const lastTeamIndex = playableTeams.findIndex((team) => team.id === lastTeamId)
  let teamIndex = lastTeamIndex === -1 ? 0 : (lastTeamIndex + 1) % playableTeams.length
  const sequence: string[] = []

  for (let turn = 0; turn < totalTurns; turn += 1) {
    const team = playableTeams[teamIndex]
    const participantId = team.members.reduce((bestId, candidateId) => {
      const bestCount = appearances.get(bestId) ?? 0
      const candidateCount = appearances.get(candidateId) ?? 0
      return candidateCount < bestCount ? candidateId : bestId
    }, team.members[0])

    sequence.push(participantId)
    appearances.set(participantId, (appearances.get(participantId) ?? 0) + 1)
    teamIndex = (teamIndex + 1) % playableTeams.length
  }

  return sequence
}

export function restorePersistedSession(session: TriviaSession | null, gameMode: GameMode): TriviaSession {
  if (!session) {
    return createSessionForMode(gameMode)
  }

  // Curas antes de entrar no estado — assim um F5 conserta a partida sem
  // perder nada: ids duplicados (bug do import em massa) e cartas presas em
  // 'active' (F5 com o modal da pergunta aberto).
  const healed = upgradeLegacyCompleteSessionId(
    releaseActiveTiles(dedupeTileIds(session)),
    gameMode,
  )

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
