import { STORAGE_KEYS } from '../../../shared/constants/storage'
import { storageService } from '../../../shared/services/storage.service'
import type { GameMode } from '../../../shared/types/game'
import type { PinRepository } from './pin.repository'

export class FirebasePinRepository implements PinRepository {
  loadPin(mode: GameMode): string {
    return storageService.get(STORAGE_KEYS.pinByMode(mode)) ?? ''
  }

  savePin(mode: GameMode, pin: string): string {
    const normalizedPin = pin.trim()
    if (!normalizedPin) {
      this.clearPin(mode)
      return ''
    }

    storageService.set(STORAGE_KEYS.pinByMode(mode), normalizedPin)
    return normalizedPin
  }

  clearPin(mode: GameMode): void {
    storageService.remove(STORAGE_KEYS.pinByMode(mode))
  }

  verifyPin(mode: GameMode, inputPin: string): boolean {
    const currentPin = this.loadPin(mode)
    return currentPin.length > 0 && inputPin === currentPin
  }

  hasCustomPin(mode: GameMode): boolean {
    return this.loadPin(mode).length > 0
  }
}
