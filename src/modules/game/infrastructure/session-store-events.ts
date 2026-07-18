type SessionStoreListener = () => void

const listeners = new Set<SessionStoreListener>()

/**
 * localStorage não dispara `storage` na mesma aba que fez a escrita. Este bus
 * pequeno mantém todos os consumidores React do repositório sincronizados sem
 * transformar persistência em estado global nem acoplar o domínio à UI.
 */
export function subscribeSessionStore(listener: SessionStoreListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifySessionStoreChanged(): void {
  for (const listener of listeners) listener()
}
