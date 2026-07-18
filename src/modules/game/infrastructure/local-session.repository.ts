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

    // Quota do localStorage é finita: escrita falhando NÃO pode passar em
    // silêncio (o usuário acharia que salvou). null sinaliza ao chamador.
    const savedById = storageService.setJson(STORAGE_KEYS.sessionById(sessionId), sessionData)

    const replacedLegacyId = current?.metadata.id
    const shouldRemoveLegacy = isLegacyCompleteSessionId(replacedLegacyId) && replacedLegacyId !== sessionId
    const nextHistory = this.loadSessionHistory().filter((item) => (
      item.id !== sessionId && (!shouldRemoveLegacy || item.id !== replacedLegacyId)
    ))
    nextHistory.unshift(sessionData.metadata)
    const keptHistory = nextHistory.slice(0, MAX_SESSION_HISTORY)
    const savedHistory = storageService.setJson(STORAGE_KEYS.sessionHistory, keptHistory)

    // O ponteiro ativo e gravado por ultimo. Se quota/storage falhar antes,
    // a partida que estava aberta continua sendo a recuperada no proximo F5.
    if (!savedById || !savedHistory) {
      return null
    }
    const savedActive = storageService.setJson(STORAGE_KEYS.activeSession, sessionData)
    if (!savedActive) return null

    // Só poda depois do commit das três chaves; uma tentativa incompleta não
    // pode remover a sessão mais antiga que ainda era válida.
    for (const pruned of nextHistory.slice(MAX_SESSION_HISTORY)) {
      storageService.remove(STORAGE_KEYS.sessionById(pruned.id))
    }

    if (shouldRemoveLegacy && replacedLegacyId) {
      storageService.remove(STORAGE_KEYS.sessionById(replacedLegacyId))
    }

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
    const activeRecord: SessionRecord = {
      ...sessionData,
      metadata: { ...sessionData.metadata, isActive: true, isSaved: true },
    }
    const savedSession = storageService.setJson(STORAGE_KEYS.sessionById(activeRecord.metadata.id), activeRecord)
    const nextHistory = this.loadSessionHistory().filter((item) => item.id !== activeRecord.metadata.id)
    nextHistory.unshift(activeRecord.metadata)
    const keptHistory = nextHistory.slice(0, MAX_SESSION_HISTORY)
    const savedHistory = storageService.setJson(STORAGE_KEYS.sessionHistory, keptHistory)
    if (!savedSession || !savedHistory) return false
    const savedActive = storageService.setJson(STORAGE_KEYS.activeSession, activeRecord)
    if (!savedActive) return false
    for (const pruned of nextHistory.slice(MAX_SESSION_HISTORY)) {
      storageService.remove(STORAGE_KEYS.sessionById(pruned.id))
    }
    return true
  }

  getBackendLabel(): string {
    return 'local'
  }
}
