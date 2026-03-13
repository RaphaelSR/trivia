import { useSearchParams } from 'react-router-dom'
import { useMemo } from 'react'
import { DEFAULT_GAME_MODE, GAME_MODE_DESCRIPTIONS, GAME_MODE_LABELS, GAME_MODES } from '../shared/constants/game'
import type { GameMode } from '../shared/types/game'

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
    isDemo,
    isOffline,
    isOnline,
    getModeDisplayName,
    getModeDescription
  }
}
