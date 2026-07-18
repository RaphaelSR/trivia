import { useCallback, useEffect, useRef, useState } from 'react'
import { useSoundSettings } from '@/hooks/useSoundSettings'
import { playThemeAudioEvent } from '@/shared/services/audio.service'
import { mountLivingScene } from '@/shared/theme/living/engine'
import {
  getLivingSceneDefinition,
  type LivingTheme,
} from '@/shared/theme/living/registry'
import type { LivingSceneRenderer } from '@/shared/theme/living/types'

export type { LivingTheme } from '@/shared/theme/living/registry'

export function LivingThemeCanvas({ theme }: { theme: LivingTheme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { settings } = useSoundSettings()
  const registration = getLivingSceneDefinition(theme)
  const [loadedScene, setLoadedScene] = useState<{
    theme: LivingTheme
    renderer: LivingSceneRenderer
  } | null>(null)
  const renderer = loadedScene?.theme === theme ? loadedScene.renderer : null
  const handleAudioEvent = useCallback(
    (event: Parameters<typeof playThemeAudioEvent>[1]) => {
      playThemeAudioEvent(theme, event)
    },
    [theme],
  )

  useEffect(() => {
    if (!registration || settings.visualEffects === 'still') return
    let cancelled = false

    void registration.loadRenderer().then(
      (nextRenderer) => {
        if (!cancelled) setLoadedScene({ theme, renderer: nextRenderer })
      },
      () => undefined,
    )

    return () => {
      cancelled = true
    }
  }, [registration, settings.visualEffects, theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !registration || !renderer || settings.visualEffects === 'still') return
    return mountLivingScene(canvas, {
      seed: registration.seed,
      layer: registration.layer,
      renderer,
    }, {
      motionMode: settings.visualEffects === 'ambient' ? 'ambient' : 'full',
      onAudioEvent: handleAudioEvent,
    })
  }, [handleAudioEvent, registration, renderer, settings.visualEffects])

  if (!registration || !renderer || settings.visualEffects === 'still') return null

  return (
    <canvas
      ref={canvasRef}
      data-living-scene={theme}
      data-motion-mode={settings.visualEffects}
      className={
        registration.layer === 'full'
          ? 'absolute inset-0 h-full w-full'
          : 'absolute inset-0 z-[2] h-full w-full'
      }
    />
  )
}
