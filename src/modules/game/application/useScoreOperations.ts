import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { createMimicaScoreEntry } from '../domain/scoring'
import { getCompleteRoundNumber } from '../domain/turn-order'
import type { MimicaScoringMode } from '../../../shared/types/game'
import type { GameEvent, TriviaSession } from '../../trivia/types'

/**
 * ID único de evento. Inclui aleatoriedade (não só Date.now) para nunca colidir
 * quando vários eventos são gerados no mesmo milissegundo.
 */
function makeEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** Append-only: nunca sobrescreve o histórico, só acrescenta. */
function appendEvent(session: TriviaSession, event: GameEvent): GameEvent[] {
  return [...(session.eventLog ?? []), event]
}

function findTile(session: TriviaSession, tileId: string) {
  return session.board.flatMap((column) => column.tiles).find((tile) => tile.id === tileId)
}

/**
 * Contexto de turno no momento da ação, derivado do estado da sessão — captura
 * turnNumber/roundNumber para eventos de trivia sem mudar a assinatura das
 * operações (simetria com os eventos de mímica, que já carregam esse contexto).
 */
function turnContext(session: TriviaSession): { turnNumber: number; roundNumber: number } {
  return {
    turnNumber: session.activeTurnIndex,
    roundNumber: getCompleteRoundNumber(
      session.activeParticipantId,
      session.turnSequence,
      session.teams,
      session.participants,
      session.activeTurnIndex,
    ),
  }
}

export function useScoreOperations(setSession: Dispatch<SetStateAction<TriviaSession>>) {
  const awardPoints = useCallback((
    tileId: string,
    teamId: string,
    participantId: string,
    pointsAwarded: number,
    source: 'trivia' | 'mimica' = 'trivia',
  ) => {
    setSession((prev) => {
      const timestamp = new Date().toISOString()
      const tile = findTile(prev, tileId)
      const { turnNumber, roundNumber } = turnContext(prev)
      const event: GameEvent = {
        id: makeEventId(),
        type: source === 'mimica' ? 'mimica-award' : 'trivia-award',
        timestamp,
        source,
        tileId,
        film: tile?.film,
        basePoints: tile?.points,
        pointsAwarded,
        participantId,
        teamId,
        turnNumber,
        roundNumber,
      }

      return {
        ...prev,
        teams: prev.teams.map((team) =>
          team.id === teamId ? { ...team, score: (team.score || 0) + pointsAwarded } : team,
        ),
        board: prev.board.map((column) => ({
          ...column,
          tiles: column.tiles.map((tile) =>
            tile.id === tileId
              ? {
                  ...tile,
                  state: 'answered',
                  answeredBy: {
                    participantId,
                    teamId,
                    pointsAwarded,
                    timestamp,
                    source,
                  },
                }
              : tile,
          ),
        })),
        eventLog: appendEvent(prev, event),
      }
    })
  }, [setSession])

  /**
   * Anula uma pergunta: marca o tile como respondido SEM pontos e registra um
   * evento 'trivia-void' no log (a vez é consumida). Substitui o antigo
   * `updateTileState(tileId, 'answered')` do fluxo de anulação, para que a ação
   * fique auditável.
   */
  const voidQuestion = useCallback((
    tileId: string,
    participantId: string,
    teamId: string,
  ) => {
    setSession((prev) => {
      const tile = findTile(prev, tileId)
      const { turnNumber, roundNumber } = turnContext(prev)
      const event: GameEvent = {
        id: makeEventId(),
        type: 'trivia-void',
        timestamp: new Date().toISOString(),
        source: 'trivia',
        tileId,
        film: tile?.film,
        basePoints: tile?.points,
        pointsAwarded: 0,
        participantId,
        teamId,
        turnNumber,
        roundNumber,
      }

      return {
        ...prev,
        board: prev.board.map((column) => ({
          ...column,
          tiles: column.tiles.map((tile) =>
            tile.id === tileId ? { ...tile, state: 'answered' } : tile,
          ),
        })),
        eventLog: appendEvent(prev, event),
      }
    })
  }, [setSession])

  const awardMimicaPoints = useCallback((
    participantId: string,
    teamId: string,
    pointsAwarded: number,
    turnNumber: number,
    roundNumber: number,
    mode: MimicaScoringMode,
    targetTeamId?: string,
  ) => {
    setSession((prev) => {
      const event: GameEvent = {
        id: makeEventId(),
        type: 'mimica-award',
        timestamp: new Date().toISOString(),
        source: 'mimica',
        pointsAwarded,
        participantId,
        teamId,
        turnNumber,
        roundNumber,
      }

      return {
        ...prev,
        teams: prev.teams.map((team) =>
          team.id === teamId ? { ...team, score: (team.score || 0) + pointsAwarded } : team,
        ),
        mimicaScores: [
          ...(prev.mimicaScores || []),
          createMimicaScoreEntry({
            participantId,
            teamId,
            pointsAwarded,
            turnNumber,
            roundNumber,
            mode,
            targetTeamId,
          }),
        ],
        eventLog: appendEvent(prev, event),
      }
    })
  }, [setSession])

  return {
    awardPoints,
    voidQuestion,
    awardMimicaPoints,
  }
}
