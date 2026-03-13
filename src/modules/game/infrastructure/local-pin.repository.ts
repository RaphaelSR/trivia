import { DEFAULT_PIN } from '../../../shared/constants/game'
import { STORAGE_KEYS } from '../../../shared/constants/storage'
import { storageService } from '../../../shared/services/storage.service'
import type { GameMode } from '../../../shared/types/game'
import type { PinRepository } from './pin.repository'

export class LocalPinRepository implements PinRepository {
  loadPin(mode: GameMode): string {
    if (mode === 'demo') {
      return DEFAULT_PIN
    }

    return storageService.get(STORAGE_KEYS.pinByMode(mode)) ?? DEFAULT_PIN
  }

  savePin(mode: GameMode, pin: string): string {
    storageService.set(STORAGE_KEYS.pinByMode(mode), pin)
    return pin
  }

  clearPin(mode: GameMode): void {
    storageService.remove(STORAGE_KEYS.pinByMode(mode))
  }

  verifyPin(mode: GameMode, inputPin: string): boolean {
    return inputPin === this.loadPin(mode)
  }

  hasCustomPin(mode: GameMode): boolean {
    return mode !== 'demo' && storageService.has(STORAGE_KEYS.pinByMode(mode))
  }
}
