import { MAX_SESSION_HISTORY } from '../../../shared/constants/game'
import { STORAGE_KEYS } from '../../../shared/constants/storage'
import { storageService } from '../../../shared/services/storage.service'
import type { GameMode } from '../../../shared/types/game'
import type { TriviaSession } from '../../trivia/types'
import type { SessionHistoryMetadata, SessionRecord, SessionRepository } from './session.repository'
import { i18n } from '@/shared/i18n'
import { isLegacyCompleteSessionId } from '../domain/session-id'

function calculateSessionDuration(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
}

export class OnlineCacheSessionRepository implements SessionRepository {
  loadActiveSession(): SessionRecord | null {
    return storageService.getJson<SessionRecord | null>(STORAGE_KEYS.onlineActiveSession, null)
  }

  loadSessionHistory(): SessionHistoryMetadata[] {
    return storageService.getJson<SessionHistoryMetadata[]>(STORAGE_KEYS.onlineSessionHistory, [])
  }

  saveSession(
    session: TriviaSession,
    mode: GameMode,
    sessionName?: string,
    current?: SessionRecord | null,
  ): SessionRecord | null {
    const now = new Date().toISOString()
    const sessionId = session.id || `online-session-${Date.now()}`
    const name = sessionName || session.title || i18n.t('game:sessionCreation.repositoryFallback', {
      date: new Date().toLocaleDateString(i18n.resolvedLanguage ?? i18n.language),
    })

    const sessionData: SessionRecord = {
      metadata: {
        id: sessionId,
        name,
        createdAt: current?.metadata.createdAt || now,
        lastModified: now,
        isActive: true,
        mode,
        duration: calculateSessionDuration(current?.metadata.createdAt || now),
        isSaved: true,
      },
      session: {
        ...session,
        id: sessionId,
        title: name,
      },
    }

    // Mesmo endurecimento do LocalSessionRepository: falha de quota não pode
    // passar em silêncio, e sessões podadas do índice não deixam arquivo órfão.
    const savedById = storageService.setJson(STORAGE_KEYS.onlineSessionById(sessionId), sessionData)

    const replacedLegacyId = current?.metadata.id
    const shouldRemoveLegacy = isLegacyCompleteSessionId(replacedLegacyId) && replacedLegacyId !== sessionId
    const nextHistory = this.loadSessionHistory().filter((item) => (
      item.id !== sessionId && (!shouldRemoveLegacy || item.id !== replacedLegacyId)
    ))
    nextHistory.unshift(sessionData.metadata)
    const keptHistory = nextHistory.slice(0, MAX_SESSION_HISTORY)
    const savedHistory = storageService.setJson(STORAGE_KEYS.onlineSessionHistory, keptHistory)

    if (!savedById || !savedHistory) {
      return null
    }
    const savedActive = storageService.setJson(STORAGE_KEYS.onlineActiveSession, sessionData)
    if (!savedActive) return null

    for (const pruned of nextHistory.slice(MAX_SESSION_HISTORY)) {
      storageService.remove(STORAGE_KEYS.onlineSessionById(pruned.id))
    }

    if (shouldRemoveLegacy && replacedLegacyId) {
      storageService.remove(STORAGE_KEYS.onlineSessionById(replacedLegacyId))
    }

    return sessionData
  }

  loadSession(sessionId: string): TriviaSession | null {
    const sessionData = storageService.getJson<SessionRecord | null>(STORAGE_KEYS.onlineSessionById(sessionId), null)
    return sessionData?.session ?? null
  }

  deleteSession(sessionId: string): void {
    const nextHistory = this.loadSessionHistory().filter((item) => item.id !== sessionId)
    storageService.setJson(STORAGE_KEYS.onlineSessionHistory, nextHistory)
    storageService.remove(STORAGE_KEYS.onlineSessionById(sessionId))

    const activeSession = this.loadActiveSession()
    if (activeSession?.metadata.id === sessionId) {
      this.clearActiveSession()
    }
  }

  clearActiveSession(): void {
    storageService.remove(STORAGE_KEYS.onlineActiveSession)
  }

  saveCompleteSession(sessionData: SessionRecord): boolean {
    const activeRecord: SessionRecord = {
      ...sessionData,
      metadata: { ...sessionData.metadata, isActive: true, isSaved: true },
    }
    const savedSession = storageService.setJson(STORAGE_KEYS.onlineSessionById(activeRecord.metadata.id), activeRecord)
    const nextHistory = this.loadSessionHistory().filter((item) => item.id !== activeRecord.metadata.id)
    nextHistory.unshift(activeRecord.metadata)
    const keptHistory = nextHistory.slice(0, MAX_SESSION_HISTORY)
    const savedHistory = storageService.setJson(STORAGE_KEYS.onlineSessionHistory, keptHistory)
    if (!savedSession || !savedHistory) return false
    const savedActive = storageService.setJson(STORAGE_KEYS.onlineActiveSession, activeRecord)
    if (!savedActive) return false
    for (const pruned of nextHistory.slice(MAX_SESSION_HISTORY)) {
      storageService.remove(STORAGE_KEYS.onlineSessionById(pruned.id))
    }
    return true
  }

  getBackendLabel(): string {
    return 'online-cache'
  }
}
