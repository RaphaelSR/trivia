import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { createSessionRepository } from '../modules/game/infrastructure/repository.factory'
import type { SessionHistoryMetadata, SessionRecord } from '../modules/game/infrastructure/session.repository'
import { MAX_SESSION_HISTORY } from '../shared/constants/game'
import { useGameMode } from './useGameMode'
import type { TriviaSession } from '../modules/trivia/types'
import { useTranslation } from '@/shared/i18n'
import { notifySessionStoreChanged, subscribeSessionStore } from '@/modules/game/infrastructure/session-store-events'

export type OfflineSessionMetadata = SessionHistoryMetadata
export type OfflineSessionData = SessionRecord

/**
 * Hook para gerenciar persistência de sessões offline/online
 * @returns Objeto com funções de gerenciamento de sessões
 */
export function useOfflineSession() {
  const { t } = useTranslation('auth')
  const { gameMode } = useGameMode()
  // Este hook gerencia exclusivamente o cache local. A replicação remota é
  // orquestrada uma única vez por useCloudSync, depois da escolha de entrada;
  // usar SupabaseSessionRepository aqui criaria um segundo writer capaz de
  // furar o gate local/nuvem e duplicar flushes.
  const sessionRepository = useMemo(
    () => createSessionRepository(gameMode),
    [gameMode],
  )
  const [currentSession, setCurrentSession] = useState<OfflineSessionData | null>(() => (
    gameMode === 'demo' ? null : sessionRepository.loadActiveSession()
  ))
  const [sessionHistory, setSessionHistory] = useState<OfflineSessionMetadata[]>(() => sessionRepository.loadSessionHistory())
  const [storageReady, setStorageReady] = useState(true)

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
      notifySessionStoreChanged()
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
      notifySessionStoreChanged()
    } else if (gameMode !== 'demo') {
      toast.error(t('services.localSave.failed'), {
        id: 'local-save-failed',
        description: t('services.localSave.description'),
        duration: 10000,
      })
    }
    return sessionData
  }, [gameMode, sessionRepository, t, updateSessionHistory])

  /** Torna uma sessão local/nuvem já existente a ativa sem trocar sua identidade. */
  const activateSessionRecord = useCallback((record: OfflineSessionData) => {
    const activeRecord: OfflineSessionData = {
      metadata: {
        ...record.metadata,
        id: record.session.id,
        name: record.session.title || record.metadata.name,
        isActive: true,
        isSaved: true,
      },
      session: {
        ...record.session,
        id: record.session.id,
        title: record.session.title || record.metadata.name,
      },
    }
    const saved = sessionRepository.saveCompleteSession(activeRecord)
    if (!saved) {
      if (gameMode !== 'demo') {
        toast.error(t('services.localSave.failed'), {
          id: 'local-save-failed',
          description: t('services.localSave.description'),
          duration: 10000,
        })
      }
      return null
    }
    setCurrentSession(activeRecord)
    updateSessionHistory(activeRecord.metadata)
    notifySessionStoreChanged()
    return activeRecord
  }, [gameMode, sessionRepository, t, updateSessionHistory])

  const loadSession = useCallback((sessionId: string): TriviaSession | null => {
    return sessionRepository.loadSession(sessionId)
  }, [sessionRepository])

  const deleteSession = useCallback((sessionId: string) => {
    sessionRepository.deleteSession(sessionId)
    setSessionHistory((prevHistory) => prevHistory.filter((session) => session.id !== sessionId))
    setCurrentSession((prevSession) => (prevSession?.metadata.id === sessionId ? null : prevSession))
    notifySessionStoreChanged()
  }, [sessionRepository])

  const clearActiveSession = useCallback(() => {
    sessionRepository.clearActiveSession()
    setCurrentSession(null)
    notifySessionStoreChanged()
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
    setStorageReady(false)
    loadSessionHistory()
    if (gameMode === 'offline' || gameMode === 'online') {
      loadActiveSession()
    } else {
      setCurrentSession(null)
    }
    setStorageReady(true)
  }, [gameMode, loadActiveSession, loadSessionHistory, sessionRepository])

  useEffect(() => subscribeSessionStore(() => {
    loadSessionHistory()
    if (gameMode === 'offline' || gameMode === 'online') {
      loadActiveSession()
    }
  }), [gameMode, loadActiveSession, loadSessionHistory])

  return {
    currentSession,
    sessionHistory,
    storageReady,
    saveSession,
    saveNewSession,
    activateSessionRecord,
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
