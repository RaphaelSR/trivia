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
    const name = sessionName || session.title || `Sessão online ${new Date().toLocaleDateString('pt-BR')}`

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
    const savedActive = storageService.setJson(STORAGE_KEYS.onlineActiveSession, sessionData)
    const savedById = storageService.setJson(STORAGE_KEYS.onlineSessionById(sessionId), sessionData)

    const nextHistory = this.loadSessionHistory().filter((item) => item.id !== sessionId)
    nextHistory.unshift(sessionData.metadata)
    const keptHistory = nextHistory.slice(0, MAX_SESSION_HISTORY)
    const savedHistory = storageService.setJson(STORAGE_KEYS.onlineSessionHistory, keptHistory)

    for (const pruned of nextHistory.slice(MAX_SESSION_HISTORY)) {
      storageService.remove(STORAGE_KEYS.onlineSessionById(pruned.id))
    }

    if (!savedActive || !savedById || !savedHistory) {
      return null
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
    const savedSession = storageService.setJson(STORAGE_KEYS.onlineSessionById(sessionData.metadata.id), sessionData)
    const savedActive = storageService.setJson(STORAGE_KEYS.onlineActiveSession, sessionData)
    return savedSession && savedActive
  }

  getBackendLabel(): string {
    return 'online-cache'
  }
}
