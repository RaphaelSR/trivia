import { useCallback, useMemo } from 'react'
import type { GameMode } from '../../../shared/types/game'
import type { DemoSessionConfig } from '../../../shared/types/game'
import { createSessionRepository } from '../infrastructure/repository.factory'
import { createSessionForMode, restorePersistedSession } from '../domain/session'

export function useSessionInitialization(gameMode: GameMode, demoConfig?: DemoSessionConfig) {
  const sessionRepository = useMemo(() => createSessionRepository(gameMode), [gameMode])

  const createInitialSession = useCallback(() => {
    const activeRecord = gameMode === 'offline' || gameMode === 'online' ? sessionRepository.loadActiveSession() : null
    const fallbackSession = createSessionForMode(gameMode, demoConfig)
    return restorePersistedSession(activeRecord?.session ?? null, gameMode) ?? fallbackSession
  }, [demoConfig, gameMode, sessionRepository])

  return {
    sessionRepository,
    createInitialSession,
  }
}
