import type { TriviaSession } from '../../trivia/types'
import { rebuildSessionTurnState, restorePersistedSession } from './session'

export type FinishedGameCopyMode = 'continue' | 'restart'

type CreateFinishedGameCopyOptions = {
  id?: string
  title: string
  nowIso?: string
}

function cloneSession(session: TriviaSession): TriviaSession {
  return {
    ...session,
    theme: {
      ...session.theme,
      palette: { ...session.theme.palette },
    },
    teams: session.teams.map((team) => ({ ...team, members: [...team.members] })),
    participants: session.participants.map((participant) => ({ ...participant })),
    board: session.board.map((column) => ({
      ...column,
      theme: column.theme ? { ...column.theme } : undefined,
      tiles: column.tiles.map((tile) => ({
        ...tile,
        answeredBy: tile.answeredBy ? { ...tile.answeredBy } : undefined,
      })),
    })),
    mimicaScores: session.mimicaScores?.map((score) => ({ ...score })),
    eventLog: session.eventLog?.map((event) => ({ ...event })),
    turnSequence: [...session.turnSequence],
  }
}

/**
 * Cria uma sessão independente a partir de um snapshot finalizado.
 *
 * O ID sempre muda: o histórico original, seus claims e a chave idempotente
 * continuam imutáveis. `continue` preserva placar/progresso para correções ou
 * mímica; `restart` mantém a configuração e recomeça a jogabilidade do zero.
 */
export function createFinishedGameCopy(
  source: TriviaSession,
  mode: FinishedGameCopyMode,
  options: CreateFinishedGameCopyOptions,
): TriviaSession {
  const nowIso = options.nowIso ?? new Date().toISOString()
  const id = options.id ?? crypto.randomUUID()
  const cloned = restorePersistedSession(cloneSession(source), 'online')
  const base: TriviaSession = {
    ...cloned,
    id,
    title: options.title,
    scheduledAt: nowIso,
  }

  if (mode === 'continue') return base

  const teams = base.teams.map((team) => ({ ...team, score: 0 }))
  const board = base.board.map((column) => ({
    ...column,
    tiles: column.tiles.map((tile) => ({
      ...tile,
      state: 'available' as const,
      answeredBy: undefined,
    })),
  }))

  return rebuildSessionTurnState(
    {
      ...base,
      teams,
      board,
      mimicaScores: [],
      eventLog: [],
      activeTurnIndex: 0,
      activeParticipantId: null,
    },
    teams,
    base.participants,
  )
}
