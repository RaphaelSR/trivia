import type { GameMode } from '../../../shared/types/game'
import { LocalPinRepository } from './local-pin.repository'
import { LocalSessionRepository } from './local-session.repository'
import { OnlineCachePinRepository } from './online-cache-pin.repository'
import { OnlineCacheSessionRepository } from './online-cache-session.repository'
import type { PinRepository } from './pin.repository'
import type { SessionRepository } from './session.repository'

const localSessionRepository = new LocalSessionRepository()
const onlineCacheSessionRepository = new OnlineCacheSessionRepository()
const localPinRepository = new LocalPinRepository()
const onlineCachePinRepository = new OnlineCachePinRepository()

export function createSessionRepository(gameMode: GameMode): SessionRepository {
  return gameMode === 'online' ? onlineCacheSessionRepository : localSessionRepository
}

export function createPinRepository(gameMode: GameMode): PinRepository {
  return gameMode === 'online' ? onlineCachePinRepository : localPinRepository
}
