import type { GameMode } from '../../../shared/types/game'
import type { TriviaSession } from '../../trivia/types'

const LEGACY_COMPLETE_SESSION_ID = 'empty-session'
let fallbackCounter = 0

/**
 * Gera a identidade opaca de uma nova partida completa.
 *
 * Navegadores suportados expõem crypto.randomUUID(). O fallback existe para
 * testes/ambientes antigos e combina tempo, contador e bytes aleatórios quando
 * disponíveis, sem depender de estado persistido.
 */
export function createCompleteSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const randomBytes = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(randomBytes)
  } else {
    for (let index = 0; index < randomBytes.length; index += 1) {
      randomBytes[index] = Math.floor(Math.random() * 256)
    }
  }

  fallbackCounter += 1
  const entropy = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `session-${Date.now().toString(36)}-${fallbackCounter.toString(36)}-${entropy}`
}

export function isLegacyCompleteSessionId(sessionId: string | null | undefined): boolean {
  return sessionId === LEGACY_COMPLETE_SESSION_ID
}

function hashLegacySnapshot(value: string, seed: number): string {
  let hash = seed >>> 0
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function buildLegacyUpgradeId(session: TriviaSession): string {
  // O mesmo snapshot antigo precisa receber o mesmo ID em todas as leituras.
  // Isso evita que o estado local e a cópia na nuvem gerem duas partidas ao
  // serem reconciliados durante o primeiro carregamento após o upgrade.
  const identityPayload = JSON.stringify({
    scheduledAt: session.scheduledAt,
  })
  const scheduledAt = Date.parse(session.scheduledAt)
  const timePart = Number.isFinite(scheduledAt) ? scheduledAt.toString(36) : 'unknown'
  const fingerprint = [
    hashLegacySnapshot(identityPayload, 0x811c9dc5),
    hashLegacySnapshot(identityPayload, 0x9e3779b9),
  ].join('')

  return `legacy-${timePart}-${fingerprint}`
}

/**
 * Corrige apenas o ID fixo usado por versões antigas em partidas completas.
 * IDs atuais, importados ou de demonstração permanecem intocados.
 */
export function upgradeLegacyCompleteSessionId(
  session: TriviaSession,
  gameMode: GameMode,
): TriviaSession {
  if (gameMode === 'demo' || !isLegacyCompleteSessionId(session.id)) {
    return session
  }

  return {
    ...session,
    id: buildLegacyUpgradeId(session),
  }
}
