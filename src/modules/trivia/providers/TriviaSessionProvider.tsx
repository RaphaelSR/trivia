import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useGameMode } from '../../../hooks/useGameMode'
import { useBoardOperations } from '../../game/application/useBoardOperations'
import { dedupeTileIds, releaseActiveTiles } from '../../game/domain/board.utils'
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
    replaceColumnTiles,
    removeQuestionTile,
  } = useBoardOperations(setSession)

  const { awardPoints, voidQuestion, awardMimicaPoints } = useScoreOperations(setSession)

  const { user } = useAuth()
  useGameHistorySync({ session, gameMode, user })

  const restoreSession = useCallback((sessionToRestore: TriviaSession) => {
    // Curas de qualquer sessão que volta do armazenamento (checkpoint,
    // snapshot na nuvem, conflito): ids duplicados e cartas presas em
    // 'active' (o estado "AO VIVO" só faz sentido com o modal aberto).
    setSession(releaseActiveTiles(dedupeTileIds(sessionToRestore)))
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
    replaceColumnTiles,
    removeQuestionTile,
    updateTeamsAndParticipants,
    awardPoints,
    voidQuestion,
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
    replaceColumnTiles,
    removeQuestionTile,
    updateTeamsAndParticipants,
    awardPoints,
    voidQuestion,
    awardMimicaPoints,
    restoreSession,
  ])

  return <TriviaSessionContext.Provider value={value}>{children}</TriviaSessionContext.Provider>
}
