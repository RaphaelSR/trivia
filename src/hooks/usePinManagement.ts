import { useEffect, useMemo, useState } from 'react'
import { createPinRepository } from '../modules/game/infrastructure/repository.factory'
import type { GameMode } from '../shared/types/game'
import { useGameMode } from './useGameMode'

/**
 * Hook para gerenciar PIN de acesso personalizado
 * @returns Objeto com funções de gerenciamento de PIN
 */
export function usePinManagement(modeOverride?: GameMode) {
  const { gameMode } = useGameMode()
  const resolvedMode = modeOverride ?? gameMode
  const pinRepository = useMemo(() => createPinRepository(resolvedMode), [resolvedMode])
  const [customPin, setCustomPin] = useState<string>('')

  useEffect(() => {
    setCustomPin(pinRepository.loadPin(resolvedMode))
  }, [resolvedMode, pinRepository])

  const saveCustomPin = (pin: string) => {
    setCustomPin(pinRepository.savePin(resolvedMode, pin))
  }

  const clearCustomPin = () => {
    setCustomPin('')
    pinRepository.clearPin(resolvedMode)
  }

  const verifyPin = (inputPin: string): boolean => {
    return pinRepository.verifyPin(resolvedMode, inputPin)
  }

  const getCurrentPin = (): string => {
    return pinRepository.loadPin(resolvedMode)
  }

  const hasCustomPin = (): boolean => {
    return pinRepository.hasCustomPin(resolvedMode)
  }

  return {
    customPin,
    saveCustomPin,
    clearCustomPin,
    verifyPin,
    getCurrentPin,
    hasCustomPin,
  }
}
