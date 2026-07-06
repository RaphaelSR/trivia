/**
 * TabGuard — detecta outras abas/janelas com a MESMA sessão ativa.
 *
 * Duas abas normais compartilham o localStorage: cada uma salva a sessão por
 * cima da outra e o progresso se corrompe em silêncio. Este guard usa um
 * BroadcastChannel com um protocolo mínimo (hello / here / bye) para cada aba
 * saber quantas outras estão na mesma partida, e a UI poder avisar.
 *
 * Limite conhecido: BroadcastChannel não cruza a fronteira janela normal ↔
 * anônima (partições de armazenamento separadas). O caso anônimo é coberto
 * pelo aviso T5 + sync na nuvem; aqui o alvo é o caso normal↔normal.
 *
 * Sem heartbeat de propósito: timers de abas em segundo plano sofrem throttle
 * agressivo (até 1/min), o que geraria falsos "a outra aba fechou". O 'bye' é
 * enviado em pagehide e no dispose; só um crash de aba deixa aviso obsoleto.
 */

import { createId } from '../../../shared/utils/id'

const CHANNEL_NAME = 'trivia-tab-guard'

interface GuardMessage {
  type: 'hello' | 'here' | 'bye'
  sessionId: string
  tabId: string
}

export interface TabGuard {
  /**
   * Registra um listener chamado com o nº de OUTRAS abas na mesma sessão.
   * Chamado imediatamente com o valor atual. Retorna o unsubscribe.
   */
  subscribe(listener: (otherTabs: number) => void): () => void
  /** Avisa as outras abas ('bye'), fecha o canal e limpa os listeners. */
  dispose(): void
}

export function createTabGuard(sessionId: string): TabGuard {
  const listeners = new Set<(otherTabs: number) => void>()

  // Ambiente sem BroadcastChannel (browsers muito antigos / SSR): inerte.
  if (typeof BroadcastChannel === 'undefined' || typeof window === 'undefined') {
    return {
      subscribe(listener) {
        listeners.add(listener)
        listener(0)
        return () => listeners.delete(listener)
      },
      dispose() {
        listeners.clear()
      },
    }
  }

  const tabId = createId('tab')
  const peers = new Set<string>()
  const channel = new BroadcastChannel(CHANNEL_NAME)

  const notify = () => {
    for (const listener of listeners) listener(peers.size)
  }

  channel.onmessage = (event: MessageEvent<GuardMessage>) => {
    const msg = event.data
    if (!msg || msg.sessionId !== sessionId || msg.tabId === tabId) return

    if (msg.type === 'bye') {
      if (peers.delete(msg.tabId)) notify()
      return
    }

    const isNew = !peers.has(msg.tabId)
    peers.add(msg.tabId)
    if (msg.type === 'hello') {
      // Aba nova chegou: responde para ela saber que já estamos aqui.
      channel.postMessage({ type: 'here', sessionId, tabId } satisfies GuardMessage)
    }
    if (isNew) notify()
  }

  const sayBye = () => {
    try {
      channel.postMessage({ type: 'bye', sessionId, tabId } satisfies GuardMessage)
    } catch {
      // Canal já fechado — nada a fazer.
    }
  }
  window.addEventListener('pagehide', sayBye)

  channel.postMessage({ type: 'hello', sessionId, tabId } satisfies GuardMessage)

  return {
    subscribe(listener) {
      listeners.add(listener)
      listener(peers.size)
      return () => listeners.delete(listener)
    },
    dispose() {
      window.removeEventListener('pagehide', sayBye)
      sayBye()
      channel.close()
      listeners.clear()
      peers.clear()
    },
  }
}
