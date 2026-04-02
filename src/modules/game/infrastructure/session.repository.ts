import type { GameMode } from '../../../shared/types/game'
import type { TriviaSession } from '../../trivia/types'

export interface SessionHistoryMetadata {
  id: string
  name: string
  createdAt: string
  lastModified: string
  isActive: boolean
  mode: GameMode
  duration: number
  isSaved: boolean
}

export interface SessionRecord {
  metadata: SessionHistoryMetadata
  session: TriviaSession
}

export interface SessionRepository {
  loadActiveSession(): SessionRecord | null
  loadSessionHistory(): SessionHistoryMetadata[]
  saveSession(session: TriviaSession, mode: GameMode, sessionName?: string, current?: SessionRecord | null): SessionRecord | null
  loadSession(sessionId: string): TriviaSession | null
  deleteSession(sessionId: string): void
  clearActiveSession(): void
  saveCompleteSession(sessionData: SessionRecord): boolean
  getBackendLabel(): string
}
