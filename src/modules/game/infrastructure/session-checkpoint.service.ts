/**
 * session-checkpoint.service
 *
 * Checkpoints LOCAIS por jogada: antes de cada ação significativa (carta
 * respondida, mímica, anulação), o estado anterior da sessão é guardado num
 * ring buffer no localStorage. É o que permite "voltar para antes daquela
 * pergunta" com precisão de uma jogada — complementa os snapshots na nuvem
 * (T4), que são periódicos e exigem login.
 *
 * Local-first por design: funciona offline e deslogado. O buffer guarda só a
 * sessão ATIVA (checkpoints de sessões antigas são podados) e é limitado a
 * MAX_CHECKPOINTS estados para respeitar a quota do localStorage.
 */

import { storageService } from '../../../shared/services/storage.service'
import { createId } from '../../../shared/utils/id'
import type { GameEvent, TriviaSession } from '../../trivia/types'

const KEY_PREFIX = 'trivia-checkpoints-'
const MAX_CHECKPOINTS = 15

export interface SessionCheckpoint {
  id: string
  createdAt: string
  /** A jogada que veio DEPOIS deste estado (ex.: "Antes de responder Matrix (10 pts)"). */
  label: string
  session: TriviaSession
}

function storageKey(sessionId: string): string {
  return `${KEY_PREFIX}${sessionId}`
}

/** Checkpoints da sessão, mais recente primeiro. */
export function listCheckpoints(sessionId: string): SessionCheckpoint[] {
  return storageService.getJson<SessionCheckpoint[]>(storageKey(sessionId), [])
}

/**
 * Guarda `sessionBefore` (o estado ANTES da jogada descrita em `label`).
 * Mantém no máximo MAX_CHECKPOINTS, mais recente primeiro, e poda buffers de
 * outras sessões — só a partida ativa merece ocupar a quota.
 */
export function saveCheckpoint(sessionBefore: TriviaSession, label: string): void {
  const entry: SessionCheckpoint = {
    id: createId('ckpt'),
    createdAt: new Date().toISOString(),
    label,
    session: sessionBefore,
  }
  const next = [entry, ...listCheckpoints(sessionBefore.id)].slice(0, MAX_CHECKPOINTS)
  storageService.setJson(storageKey(sessionBefore.id), next)
  pruneOtherSessions(sessionBefore.id)
}

export function clearCheckpoints(sessionId: string): void {
  storageService.remove(storageKey(sessionId))
}

/** Remove buffers de checkpoint de sessões que não são a ativa. */
function pruneOtherSessions(keepSessionId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  const keep = storageKey(keepSessionId)
  const stale: string[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (key && key.startsWith(KEY_PREFIX) && key !== keep) stale.push(key)
  }
  for (const key of stale) storageService.remove(key)
}

/**
 * Descreve a jogada que um novo evento do log representa, para rotular o
 * checkpoint do estado anterior a ela.
 */
export function describeMove(event: GameEvent | undefined): string {
  if (!event) return 'Antes de um ajuste no placar'
  if (event.source === 'mimica') {
    return `Antes da mímica (${event.pointsAwarded} pts)`
  }
  const film = event.film ?? 'uma pergunta'
  if (event.type === 'trivia-void') {
    return `Antes de anular ${film}`
  }
  return `Antes de responder ${film} (${event.pointsAwarded} pts)`
}
