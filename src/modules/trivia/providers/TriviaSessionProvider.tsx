import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useGameMode } from '../../../hooks/useGameMode'
import { useBoardOperations } from '../../game/application/useBoardOperations'
import { useScoreOperations } from '../../game/application/useScoreOperations'
import { useSessionInitialization } from '../../game/application/useSessionInitialization'
import { useTurnManagement } from '../../game/application/useTurnManagement'
import type { TriviaSession } from '../types'
import { TriviaSessionContext } from '../context/TriviaSessionContext'

type TriviaSessionProviderProps = {
  children: ReactNode
}

export function TriviaSessionProvider({ children }: TriviaSessionProviderProps) {
  const { gameMode } = useGameMode()
  const { createInitialSession } = useSessionInitialization(gameMode)
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

  const restoreSession = useCallback((sessionToRestore: TriviaSession) => {
    setSession(sessionToRestore)
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
