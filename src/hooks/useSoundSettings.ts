import { useCallback, useSyncExternalStore } from 'react'
import {
  DEFAULT_SOUND_SETTINGS,
  getSoundSettings,
  setSoundSettings,
  subscribeSoundSettings,
  type SoundSettings,
} from '@/shared/services/sound-settings'

export function useSoundSettings() {
  const settings = useSyncExternalStore(
    subscribeSoundSettings,
    getSoundSettings,
    () => DEFAULT_SOUND_SETTINGS,
  )

  const update = useCallback((patch: Partial<SoundSettings>) => {
    setSoundSettings(patch)
  }, [])

  return { settings, update }
}
