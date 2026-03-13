import { useState, useEffect, useCallback, useMemo } from 'react'
import { createSessionRepository } from '../modules/game/infrastructure/repository.factory'
import type { SessionHistoryMetadata, SessionRecord } from '../modules/game/infrastructure/session.repository'
import { MAX_SESSION_HISTORY } from '../shared/constants/game'
import { useGameMode } from './useGameMode'
import type { TriviaSession } from '../modules/trivia/types'

export interface OfflineSessionMetadata extends SessionHistoryMetadata {}
export interface OfflineSessionData extends SessionRecord {}

/**
 * Hook para gerenciar persistência de sessões offline/online
 * @returns Objeto com funções de gerenciamento de sessões
 */
export function useOfflineSession() {
  const { gameMode } = useGameMode()
  const sessionRepository = useMemo(() => createSessionRepository(gameMode), [gameMode])
  const [currentSession, setCurrentSession] = useState<OfflineSessionData | null>(null)
  const [sessionHistory, setSessionHistory] = useState<OfflineSessionMetadata[]>([])

  const calculateSessionDuration = useCallback((createdAt: string): number => {
    const created = new Date(createdAt)
    const now = new Date()
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
  }, [])

  const loadSessionHistory = useCallback(() => {
    setSessionHistory(sessionRepository.loadSessionHistory())
  }, [sessionRepository])

  const loadActiveSession = useCallback(() => {
    setCurrentSession(sessionRepository.loadActiveSession())
  }, [sessionRepository])

  const updateSessionHistory = useCallback((metadata: OfflineSessionMetadata) => {
    setSessionHistory((prevHistory) => {
      const updatedHistory = prevHistory.filter((session) => session.id !== metadata.id)
      updatedHistory.unshift(metadata)
      return updatedHistory.slice(0, MAX_SESSION_HISTORY)
    })
  }, [])

  const saveSession = useCallback((session: TriviaSession, sessionName?: string) => {
    const sessionData = sessionRepository.saveSession(session, gameMode, sessionName, currentSession)
    if (sessionData) {
      setCurrentSession(sessionData)
      updateSessionHistory(sessionData.metadata)
    }
    return sessionData
  }, [currentSession, gameMode, sessionRepository, updateSessionHistory])

  const loadSession = useCallback((sessionId: string): TriviaSession | null => {
    return sessionRepository.loadSession(sessionId)
  }, [sessionRepository])

  const deleteSession = useCallback((sessionId: string) => {
    sessionRepository.deleteSession(sessionId)
    setSessionHistory((prevHistory) => prevHistory.filter((session) => session.id !== sessionId))
    setCurrentSession((prevSession) => (prevSession?.metadata.id === sessionId ? null : prevSession))
  }, [sessionRepository])

  const clearActiveSession = useCallback(() => {
    sessionRepository.clearActiveSession()
    setCurrentSession(null)
  }, [sessionRepository])

  const getSessionStatus = useCallback(() => {
    if (!currentSession) {
      return {
        hasActiveSession: false,
        sessionName: null,
        duration: 0,
        isSaved: false,
      }
    }

    return {
      hasActiveSession: true,
      sessionName: currentSession.metadata.name,
      duration: calculateSessionDuration(currentSession.metadata.createdAt),
      isSaved: currentSession.metadata.isSaved,
    }
  }, [currentSession, calculateSessionDuration])

  useEffect(() => {
    loadSessionHistory()
  }, [loadSessionHistory])

  useEffect(() => {
    if (gameMode === 'offline' || gameMode === 'online') {
      loadActiveSession()
    }
  }, [gameMode, loadActiveSession])

  return {
    currentSession,
    sessionHistory,
    saveSession,
    loadSession,
    deleteSession,
    clearActiveSession,
    getSessionStatus,
    updateSessionHistory,
  }
}

export const saveCompleteSession = (sessionData: OfflineSessionData) => {
  return createSessionRepository(sessionData.metadata.mode).saveCompleteSession(sessionData)
}
