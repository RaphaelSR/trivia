import type { GameMode } from '../../../shared/types/game'

export interface PinRepository {
  loadPin(mode: GameMode): string
  savePin(mode: GameMode, pin: string): string
  clearPin(mode: GameMode): void
  verifyPin(mode: GameMode, inputPin: string): boolean
  hasCustomPin(mode: GameMode): boolean
}
