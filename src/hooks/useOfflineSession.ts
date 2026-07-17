import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { createSessionRepository } from '../modules/game/infrastructure/repository.factory'
import type { SessionHistoryMetadata, SessionRecord } from '../modules/game/infrastructure/session.repository'
import { MAX_SESSION_HISTORY } from '../shared/constants/game'
import { useGameMode } from './useGameMode'
import { useAuth } from '../modules/auth/hooks/useAuth'
import type { TriviaSession } from '../modules/trivia/types'
import { useTranslation } from '@/shared/i18n'

export type OfflineSessionMetadata = SessionHistoryMetadata
export type OfflineSessionData = SessionRecord

/**
 * Hook para gerenciar persistência de sessões offline/online
 * @returns Objeto com funções de gerenciamento de sessões
 */
export function useOfflineSession() {
  const { t } = useTranslation('auth')
  const { gameMode } = useGameMode()
  const { user } = useAuth()
  const sessionRepository = useMemo(
    () => createSessionRepository(gameMode, Boolean(user)),
    [gameMode, user],
  )
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
    } else if (gameMode !== 'demo') {
      // Quota do navegador cheia (ou storage indisponível): o pior erro é o
      // silencioso — o host acharia que salvou. id fixo evita empilhar toasts
      // a cada autosave.
      toast.error(t('services.localSave.failed'), {
        id: 'local-save-failed',
        description: t('services.localSave.description'),
        duration: 10000,
      })
    }
    return sessionData
  }, [currentSession, gameMode, sessionRepository, t, updateSessionHistory])

  /** Salva uma sessão com ciclo de vida novo, sem herdar metadata da ativa. */
  const saveNewSession = useCallback((session: TriviaSession, sessionName?: string) => {
    const sessionData = sessionRepository.saveSession(session, gameMode, sessionName, null)
    if (sessionData) {
      setCurrentSession(sessionData)
      updateSessionHistory(sessionData.metadata)
    } else if (gameMode !== 'demo') {
      toast.error(t('services.localSave.failed'), {
        id: 'local-save-failed',
        description: t('services.localSave.description'),
        duration: 10000,
      })
    }
    return sessionData
  }, [gameMode, sessionRepository, t, updateSessionHistory])

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
    saveNewSession,
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
