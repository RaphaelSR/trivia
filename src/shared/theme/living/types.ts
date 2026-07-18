import type { ThemeMode } from '@/shared/types/game'

export const CURRENT_LIVING_THEME_IDS = [
  'world-cup-2026',
  'kawaii',
  'neon-city',
  'storybook',
  'web-city',
  'deep-space',
  'midnight-cinema',
  'underwater',
] as const

export const NEW_LIVING_THEME_IDS = [
  'neon-grand-prix',
  'pixel-bomb-arena',
  'shadow-dojo',
  'wasteland-rooftops',
  'enchanted-kingdom',
  'starfighter-battle',
  'moonlit-liner',
  'castaway-island',
  'family-noir',
] as const

export const LIVING_THEME_IDS = [
  ...CURRENT_LIVING_THEME_IDS,
  ...NEW_LIVING_THEME_IDS,
] as const satisfies readonly ThemeMode[]

export type LivingTheme = (typeof LIVING_THEME_IDS)[number]

export type LivingSceneLayer = 'full' | 'overlay'

export type LivingSceneViewport = {
  width: number
  height: number
  dpr: number
  density: number
}

export type LivingSceneInit = {
  viewport: LivingSceneViewport
  seed: number
  random: () => number
}

/**
 * Uma instância mantém todo o estado narrativo da cena. O motor nunca recria
 * essa instância em resize; apenas entrega o novo viewport.
 */
export type LivingSceneInstance = {
  resize: (viewport: LivingSceneViewport) => void
  update: (deltaSeconds: number) => void
  render: (
    context: CanvasRenderingContext2D,
    viewport: LivingSceneViewport,
    elapsedSeconds: number,
  ) => void
  dispose?: () => void
}

export type LivingSceneRenderer = {
  create: (init: LivingSceneInit) => LivingSceneInstance
}

export type LivingSceneDefinition = {
  seed: number
  layer: LivingSceneLayer
  renderer: LivingSceneRenderer
}

export type LivingSceneRendererLoader = () => Promise<LivingSceneRenderer>

export type LivingSceneRegistration = Omit<LivingSceneDefinition, 'renderer'> & {
  loadRenderer: LivingSceneRendererLoader
}
