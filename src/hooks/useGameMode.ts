import { useSearchParams } from 'react-router-dom'
import { useMemo } from 'react'
import {
  DEFAULT_DEMO_SESSION_CONFIG,
  DEFAULT_GAME_MODE,
  DEMO_MEMBERS_PER_TEAM_OPTIONS,
  DEMO_QUESTION_OPTIONS,
  DEMO_TEAM_OPTIONS,
  GAME_MODE_DESCRIPTIONS,
  GAME_MODE_LABELS,
  GAME_MODES,
} from '../shared/constants/game'
import type { DemoSessionConfig, GameMode } from '../shared/types/game'

function readDemoOption(
  rawValue: string | null,
  allowedValues: readonly number[],
  fallbackValue: number,
): number {
  const parsedValue = Number(rawValue)
  return Number.isInteger(parsedValue) && allowedValues.includes(parsedValue) ? parsedValue : fallbackValue
}

/**
 * Hook para gerenciar o modo de jogo atual
 * @returns Objeto com o modo atual e funções utilitárias
 */
export function useGameMode() {
  const [searchParams] = useSearchParams()

  const gameMode = useMemo((): GameMode => {
    const mode = searchParams.get('mode') as GameMode | null
    return mode && GAME_MODES.includes(mode) ? mode : DEFAULT_GAME_MODE
  }, [searchParams])

  const demoConfig = useMemo<DemoSessionConfig>(() => {
    return {
      teamCount: readDemoOption(
        searchParams.get('demoTeams'),
        DEMO_TEAM_OPTIONS,
        DEFAULT_DEMO_SESSION_CONFIG.teamCount,
      ),
      membersPerTeam: readDemoOption(
        searchParams.get('demoMembers'),
        DEMO_MEMBERS_PER_TEAM_OPTIONS,
        DEFAULT_DEMO_SESSION_CONFIG.membersPerTeam,
      ),
      questionCount: readDemoOption(
        searchParams.get('demoQuestions'),
        DEMO_QUESTION_OPTIONS,
        DEFAULT_DEMO_SESSION_CONFIG.questionCount,
      ),
    }
  }, [searchParams])

  const isDemo = gameMode === 'demo'
  const isOffline = gameMode === 'offline'
  const isOnline = gameMode === 'online'

  const getModeDisplayName = (mode: GameMode): string => {
    return GAME_MODE_LABELS[mode] ?? GAME_MODE_LABELS.demo
  }

  const getModeDescription = (mode: GameMode): string => {
    return GAME_MODE_DESCRIPTIONS[mode] ?? GAME_MODE_DESCRIPTIONS.demo
  }

  return {
    gameMode,
    demoConfig,
    isDemo,
    isOffline,
    isOnline,
    getModeDisplayName,
    getModeDescription
  }
}
