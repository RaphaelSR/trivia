import { useCallback, useMemo } from 'react'
import type { GameMode } from '../../../shared/types/game'
import type { DemoSessionConfig } from '../../../shared/types/game'
import { createSessionRepository } from '../infrastructure/repository.factory'
import { createSessionForMode, restorePersistedSession } from '../domain/session'
import { useTranslation } from '@/shared/i18n'
import { DEFAULT_DEMO_SESSION_CONFIG } from '@/shared/constants/game'

export function useSessionInitialization(gameMode: GameMode, demoConfig?: DemoSessionConfig) {
  const { t, i18n } = useTranslation('game')
  const sessionRepository = useMemo(() => createSessionRepository(gameMode), [gameMode])

  const createInitialSession = useCallback(() => {
    const activeRecord = gameMode === 'offline' || gameMode === 'online' ? sessionRepository.loadActiveSession() : null
    const locale = i18n.resolvedLanguage ?? i18n.language
    const title = gameMode === 'demo'
      ? t('sessionCreation.demoTitle', {
          teams: demoConfig?.teamCount ?? DEFAULT_DEMO_SESSION_CONFIG.teamCount,
          members: demoConfig?.membersPerTeam ?? DEFAULT_DEMO_SESSION_CONFIG.membersPerTeam,
        })
      : t('sessionCreation.defaultTitle', { date: new Date().toLocaleDateString(locale) })
    const fallbackSession = createSessionForMode(gameMode, demoConfig, {
      title,
      themeName: t('onboarding.themes.dark.name'),
      demoPlayer: (number) => t('sessionCreation.demoPlayer', { number }),
    })
    return activeRecord?.session
      ? restorePersistedSession(activeRecord.session, gameMode)
      : fallbackSession
  }, [demoConfig, gameMode, i18n.language, i18n.resolvedLanguage, sessionRepository, t])

  return {
    sessionRepository,
    createInitialSession,
  }
}
