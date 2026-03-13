import { MAX_SESSION_HISTORY } from '../../../shared/constants/game'
import { STORAGE_KEYS } from '../../../shared/constants/storage'
import { storageService } from '../../../shared/services/storage.service'
import type { GameMode } from '../../../shared/types/game'
import type { TriviaSession } from '../../trivia/types'
import type { SessionHistoryMetadata, SessionRecord, SessionRepository } from './session.repository'

function calculateSessionDuration(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
}

export class LocalSessionRepository implements SessionRepository {
  loadActiveSession(): SessionRecord | null {
    return storageService.getJson<SessionRecord | null>(STORAGE_KEYS.activeSession, null)
  }

  loadSessionHistory(): SessionHistoryMetadata[] {
    return storageService.getJson<SessionHistoryMetadata[]>(STORAGE_KEYS.sessionHistory, [])
  }

  saveSession(
    session: TriviaSession,
    mode: GameMode,
    sessionName?: string,
    current?: SessionRecord | null,
  ): SessionRecord | null {
    const now = new Date().toISOString()
    const sessionId = session.id || `session-${Date.now()}`
    const name = sessionName || session.title || `Sessao ${new Date().toLocaleDateString('pt-BR')}`

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

    storageService.setJson(STORAGE_KEYS.activeSession, sessionData)
    storageService.setJson(STORAGE_KEYS.sessionById(sessionId), sessionData)

    const nextHistory = this.loadSessionHistory().filter((item) => item.id !== sessionId)
    nextHistory.unshift(sessionData.metadata)
    storageService.setJson(STORAGE_KEYS.sessionHistory, nextHistory.slice(0, MAX_SESSION_HISTORY))

    return sessionData
  }

  loadSession(sessionId: string): TriviaSession | null {
    const sessionData = storageService.getJson<SessionRecord | null>(STORAGE_KEYS.sessionById(sessionId), null)
    return sessionData?.session ?? null
  }

  deleteSession(sessionId: string): void {
    const nextHistory = this.loadSessionHistory().filter((item) => item.id !== sessionId)
    storageService.setJson(STORAGE_KEYS.sessionHistory, nextHistory)
    storageService.remove(STORAGE_KEYS.sessionById(sessionId))

    const activeSession = this.loadActiveSession()
    if (activeSession?.metadata.id === sessionId) {
      this.clearActiveSession()
    }
  }

  clearActiveSession(): void {
    storageService.remove(STORAGE_KEYS.activeSession)
  }

  saveCompleteSession(sessionData: SessionRecord): boolean {
    const savedSession = storageService.setJson(STORAGE_KEYS.sessionById(sessionData.metadata.id), sessionData)
    const savedActive = storageService.setJson(STORAGE_KEYS.activeSession, sessionData)
    return savedSession && savedActive
  }

  getBackendLabel(): string {
    return 'local'
  }
}
