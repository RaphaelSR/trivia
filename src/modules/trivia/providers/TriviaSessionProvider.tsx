import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useGameMode } from '../../../hooks/useGameMode'
import { useBoardOperations } from '../../game/application/useBoardOperations'
import { dedupeTileIds } from '../../game/domain/board.utils'
import { useScoreOperations } from '../../game/application/useScoreOperations'
import { useSessionInitialization } from '../../game/application/useSessionInitialization'
import { useTurnManagement } from '../../game/application/useTurnManagement'
import type { TriviaSession } from '../types'
import { TriviaSessionContext } from '../context/TriviaSessionContext'
import { useAuth } from '../../auth/hooks/useAuth'
import { useGameHistorySync } from '../../auth/hooks/useGameHistorySync'

type TriviaSessionProviderProps = {
  children: ReactNode
}

export function TriviaSessionProvider({ children }: TriviaSessionProviderProps) {
  const { gameMode, demoConfig } = useGameMode()
  const { createInitialSession } = useSessionInitialization(gameMode, demoConfig)
  const [session, setSession] = useState<TriviaSession>(() => createInitialSession())

  useEffect(() => {
    setSession(createInitialSession())
  }, [createInitialSession, gameMode])

  const {
    teams,
    activeParticipant,
    activeTeam,
    nextParticipant,
    nextTeam,
    advanceTurn,
    setActiveTeam,
    updateTeamsAndParticipants,
  } = useTurnManagement(session, setSession)

  const {
    updateTileState,
    updateTileContent,
    updateColumnTitle,
    addFilmColumn,
    removeFilmColumn,
    addQuestionTile,
    removeQuestionTile,
  } = useBoardOperations(setSession)

  const { awardPoints, awardMimicaPoints } = useScoreOperations(setSession)

  const { user } = useAuth()
  useGameHistorySync({ session, gameMode, user })

  const restoreSession = useCallback((sessionToRestore: TriviaSession) => {
    // Também cura ids duplicados quando a sessão vem da nuvem (cross-device),
    // não só no load local — a cópia na nuvem pode ter sido salva antes do fix.
    setSession(dedupeTileIds(sessionToRestore))
  }, [])

  const value = useMemo(() => ({
    session,
    teams,
    participants: session.participants,
    activeTeam,
    nextTeam,
    activeParticipant,
    nextParticipant,
    advanceTurn,
    setActiveTeam,
    updateTileState,
    updateTileContent,
    updateColumnTitle,
    addFilmColumn,
    removeFilmColumn,
    addQuestionTile,
    removeQuestionTile,
    updateTeamsAndParticipants,
    awardPoints,
    awardMimicaPoints,
    restoreSession,
  }), [
    session,
    teams,
    activeTeam,
    nextTeam,
    activeParticipant,
    nextParticipant,
    advanceTurn,
    setActiveTeam,
    updateTileState,
    updateTileContent,
    updateColumnTitle,
    addFilmColumn,
    removeFilmColumn,
    addQuestionTile,
    removeQuestionTile,
    updateTeamsAndParticipants,
    awardPoints,
    awardMimicaPoints,
    restoreSession,
  ])

  return <TriviaSessionContext.Provider value={value}>{children}</TriviaSessionContext.Provider>
}
