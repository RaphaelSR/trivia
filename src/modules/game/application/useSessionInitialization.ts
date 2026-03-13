import { useCallback, useMemo } from 'react'
import type { GameMode } from '../../../shared/types/game'
import { createSessionRepository } from '../infrastructure/repository.factory'
import { createSessionForMode, restorePersistedSession } from '../domain/session'

export function useSessionInitialization(gameMode: GameMode) {
  const sessionRepository = useMemo(() => createSessionRepository(gameMode), [gameMode])

  const createInitialSession = useCallback(() => {
    const activeRecord = gameMode === 'offline' || gameMode === 'online' ? sessionRepository.loadActiveSession() : null
    const fallbackSession = createSessionForMode(gameMode)
    return restorePersistedSession(activeRecord?.session ?? null, gameMode) ?? fallbackSession
  }, [gameMode, sessionRepository])

  return {
    sessionRepository,
    createInitialSession,
  }
}
