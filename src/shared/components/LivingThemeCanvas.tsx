import { useEffect, useRef, useState } from 'react'
import { mountLivingScene } from '@/shared/theme/living/engine'
import {
  getLivingSceneDefinition,
  type LivingTheme,
} from '@/shared/theme/living/registry'
import type { LivingSceneRenderer } from '@/shared/theme/living/types'

export type { LivingTheme } from '@/shared/theme/living/registry'

export function LivingThemeCanvas({ theme }: { theme: LivingTheme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const registration = getLivingSceneDefinition(theme)
  const [loadedScene, setLoadedScene] = useState<{
    theme: LivingTheme
    renderer: LivingSceneRenderer
  } | null>(null)
  const renderer = loadedScene?.theme === theme ? loadedScene.renderer : null

  useEffect(() => {
    if (!registration) return
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
  }, [registration, theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !registration || !renderer) return
    return mountLivingScene(canvas, {
      seed: registration.seed,
      layer: registration.layer,
      renderer,
    })
  }, [registration, renderer])

  if (!registration || !renderer) return null

  return (
    <canvas
      ref={canvasRef}
      data-living-scene={theme}
      className={
        registration.layer === 'full'
          ? 'absolute inset-0 h-full w-full'
          : 'absolute inset-0 z-[2] h-full w-full'
      }
    />
  )
}
