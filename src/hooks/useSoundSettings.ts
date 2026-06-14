import { useCallback, useState } from 'react'
import {
  getSoundSettings,
  setSoundSettings,
  type SoundSettings,
} from '../shared/services/sound-settings'

/**
 * Lê/atualiza as preferências de som (T9). A fonte é o módulo sound-settings
 * (localStorage + cache); este hook mantém um espelho em estado para a UI.
 */
export function useSoundSettings() {
  const [settings, setSettings] = useState<SoundSettings>(() => getSoundSettings())

  const update = useCallback((patch: Partial<SoundSettings>) => {
    setSettings(setSoundSettings(patch))
  }, [])

  return { settings, update }
}
