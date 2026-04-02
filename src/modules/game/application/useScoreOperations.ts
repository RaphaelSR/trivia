import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { createMimicaScoreEntry } from '../domain/scoring'
import type { MimicaScoringMode } from '../../../shared/types/game'
import type { TriviaSession } from '../../trivia/types'

export function useScoreOperations(setSession: Dispatch<SetStateAction<TriviaSession>>) {
  const awardPoints = useCallback((
    tileId: string,
    teamId: string,
    participantId: string,
    pointsAwarded: number,
    source: 'trivia' | 'mimica' = 'trivia',
  ) => {
    setSession((prev) => ({
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
                  timestamp: new Date().toISOString(),
                  source,
                },
              }
            : tile,
        ),
      })),
    }))
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
    setSession((prev) => ({
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
    }))
  }, [setSession])

  return {
    awardPoints,
    awardMimicaPoints,
  }
}
