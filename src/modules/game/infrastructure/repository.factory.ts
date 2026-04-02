import type { GameMode } from '../../../shared/types/game'
import { FirebasePinRepository } from './firebase-pin.repository'
import { FirebaseSessionRepository } from './firebase-session.repository'
import { LocalPinRepository } from './local-pin.repository'
import { LocalSessionRepository } from './local-session.repository'
import type { PinRepository } from './pin.repository'
import type { SessionRepository } from './session.repository'

const localSessionRepository = new LocalSessionRepository()
const firebaseSessionRepository = new FirebaseSessionRepository()
const localPinRepository = new LocalPinRepository()
const firebasePinRepository = new FirebasePinRepository()

export function createSessionRepository(gameMode: GameMode): SessionRepository {
  return gameMode === 'online' ? firebaseSessionRepository : localSessionRepository
}

export function createPinRepository(gameMode: GameMode): PinRepository {
  return gameMode === 'online' ? firebasePinRepository : localPinRepository
}
