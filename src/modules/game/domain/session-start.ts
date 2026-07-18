import { countAnsweredTiles, countTotalTiles } from './board.utils'
import { compareEventLogs } from './session'
import type { GameEvent, TriviaSession } from '../../trivia/types'

export type SessionVersionRelation =
  | 'same'
  | 'local-ahead'
  | 'cloud-ahead'
  | 'conflict'
  | 'different-sessions'

export type SessionStartSummary = {
  answered: number
  totalQuestions: number
  teams: number
  participants: number
  score: number
  lastEvent: GameEvent | null
}

export function hasMeaningfulSessionData(session: TriviaSession | null | undefined): boolean {
  if (!session) return false
  return (
    session.teams.length > 0 ||
    session.participants.length > 0 ||
    session.board.length > 0 ||
    (session.mimicaScores?.length ?? 0) > 0 ||
    (session.eventLog?.length ?? 0) > 0
  )
}

export function summarizeSessionStart(session: TriviaSession): SessionStartSummary {
  const eventLog = session.eventLog ?? []
  return {
    answered: countAnsweredTiles(session.board),
    totalQuestions: countTotalTiles(session.board),
    teams: session.teams.length,
    participants: session.participants.length,
    score: session.teams.reduce((sum, team) => sum + (team.score || 0), 0),
    lastEvent: eventLog[eventLog.length - 1] ?? null,
  }
}

function timestampValue(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Compara duas cópias que podem ter vindo do navegador e da nuvem.
 *
 * IDs diferentes são partidas diferentes, independentemente de data ou
 * progresso. Essa regra impede que uma partida antiga na nuvem seja usada
 * como se fosse uma versão mais avançada de uma partida recém-criada.
 */
export function compareSessionVersions(
  localSession: TriviaSession,
  cloudSession: TriviaSession,
  localUpdatedAt?: string | null,
  cloudUpdatedAt?: string | null,
): SessionVersionRelation {
  if (localSession.id !== cloudSession.id) return 'different-sessions'

  const localLog = localSession.eventLog
  const cloudLog = cloudSession.eventLog
  if (localLog && cloudLog) {
    const relation = compareEventLogs(localLog, cloudLog)
    if (relation === 'diverged') return 'conflict'
    if (relation === 'first-ahead') return 'local-ahead'
    if (relation === 'second-ahead') return 'cloud-ahead'
  }

  const localProgress = countAnsweredTiles(localSession.board)
  const cloudProgress = countAnsweredTiles(cloudSession.board)
  if (localProgress > cloudProgress) return 'local-ahead'
  if (cloudProgress > localProgress) return 'cloud-ahead'

  const localTimestamp = timestampValue(localUpdatedAt)
  const cloudTimestamp = timestampValue(cloudUpdatedAt)
  if (localTimestamp !== null && cloudTimestamp !== null) {
    if (localTimestamp > cloudTimestamp) return 'local-ahead'
    if (cloudTimestamp > localTimestamp) return 'cloud-ahead'
  }

  return 'same'
}
