/**
 * useTabGuard
 *
 * Diz se OUTRA aba/janela deste navegador está com a mesma sessão aberta,
 * para a UI avisar antes que as duas comecem a se sobrescrever no
 * localStorage. Recria o guard quando a sessão muda (restore / novo jogo).
 */

import { useEffect, useState } from 'react'
import { createTabGuard } from '../infrastructure/tab-guard'

export function useTabGuard(sessionId: string, enabled: boolean): boolean {
  const [otherTabs, setOtherTabs] = useState(0)

  useEffect(() => {
    if (!enabled || !sessionId) {
      setOtherTabs(0)
      return
    }

    const guard = createTabGuard(sessionId)
    const unsubscribe = guard.subscribe(setOtherTabs)
    return () => {
      unsubscribe()
      guard.dispose()
    }
  }, [sessionId, enabled])

  return otherTabs > 0
}
