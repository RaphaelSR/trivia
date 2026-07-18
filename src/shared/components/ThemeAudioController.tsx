import { useEffect } from 'react'
import { useSoundSettings } from '@/hooks/useSoundSettings'
import {
  releaseAudioSession,
  setThemeSoundscape,
  stopThemeSoundscape,
} from '@/shared/services/audio.service'
import type { ThemeMode } from '@/shared/types/game'

export function ThemeAudioController({ theme }: { theme: ThemeMode }) {
  const { settings } = useSoundSettings()

  useEffect(() => {
    if (settings.mode === 'off' || !settings.ambience) {
      stopThemeSoundscape()
      return
    }

    setThemeSoundscape(theme)
  }, [settings.ambience, settings.mode, settings.themeVolume, settings.volume, theme])

  useEffect(() => () => releaseAudioSession(), [])

  return null
}
