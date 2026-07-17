import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useGameMode } from '../../../hooks/useGameMode'
import { useBoardOperations } from '../../game/application/useBoardOperations'
import { restorePersistedSession } from '../../game/domain/session'
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

  const initializationKey = gameMode === 'demo'
    ? `${gameMode}:${demoConfig?.teamCount ?? ''}:${demoConfig?.membersPerTeam ?? ''}:${demoConfig?.questionCount ?? ''}`
    : gameMode
  const initializedKeyRef = useRef(initializationKey)

  useEffect(() => {
    if (initializedKeyRef.current === initializationKey) return
    initializedKeyRef.current = initializationKey
    setSession(createInitialSession())
  }, [createInitialSession, initializationKey])

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

  const updateSessionInfo = useCallback((updates: Partial<Pick<TriviaSession, 'title' | 'scheduledAt'>>) => {
    setSession((prev) => ({ ...prev, ...updates }))
  }, [])

  const restoreSession = useCallback((sessionToRestore: TriviaSession) => {
    // Curas de qualquer sessão que volta do armazenamento (checkpoint,
    // snapshot na nuvem, conflito): ids duplicados e cartas presas em
    // 'active' (o estado "AO VIVO" só faz sentido com o modal aberto).
    setSession(restorePersistedSession(sessionToRestore, gameMode))
  }, [gameMode])

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
    updateSessionInfo,
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
    updateSessionInfo,
  ])

  return <TriviaSessionContext.Provider value={value}>{children}</TriviaSessionContext.Provider>
}
