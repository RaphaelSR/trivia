import type { GameMode } from '../../../shared/types/game'
import { LocalPinRepository } from './local-pin.repository'
import { LocalSessionRepository } from './local-session.repository'
import { OnlineCachePinRepository } from './online-cache-pin.repository'
import { OnlineCacheSessionRepository } from './online-cache-session.repository'
import { SupabaseSessionRepository } from './supabase-session.repository'
import type { PinRepository } from './pin.repository'
import type { SessionRepository } from './session.repository'

const localSessionRepository = new LocalSessionRepository()
const onlineCacheSessionRepository = new OnlineCacheSessionRepository()
const localPinRepository = new LocalPinRepository()
const onlineCachePinRepository = new OnlineCachePinRepository()

// Lazy singleton — instanciado apenas quando online+auth é pedido, porque o
// construtor registra listeners de window (flush em beforeunload).
let _supabaseSessionRepository: SessionRepository | null = null
function getSupabaseSessionRepository(): SessionRepository {
  if (!_supabaseSessionRepository) {
    _supabaseSessionRepository = new SupabaseSessionRepository()
  }
  return _supabaseSessionRepository
}

/**
 * createSessionRepository
 *
 * @param gameMode       - current game mode
 * @param isAuthenticated - whether the user is logged in (default: false — preserves all existing call-sites)
 *
 * Matrix:
 *  online  + auth  => SupabaseSessionRepository   (lazy singleton)
 *  online  + !auth => OnlineCacheSessionRepository (singleton)
 *  offline | demo  => LocalSessionRepository       (singleton)
 */
export function createSessionRepository(gameMode: GameMode, isAuthenticated = false): SessionRepository {
  if (gameMode === 'online') {
    return isAuthenticated ? getSupabaseSessionRepository() : onlineCacheSessionRepository
  }
  return localSessionRepository
}

export function createPinRepository(gameMode: GameMode): PinRepository {
  return gameMode === 'online' ? onlineCachePinRepository : localPinRepository
}
