import {
  CURRENT_LIVING_THEME_IDS,
  LIVING_THEME_IDS,
  NEW_LIVING_THEME_IDS,
  type LivingSceneRegistration,
  type LivingSceneRendererLoader,
  type LivingTheme,
} from './types'

type CurrentLivingTheme = (typeof CURRENT_LIVING_THEME_IDS)[number]

function loadCurrentScene(theme: CurrentLivingTheme): LivingSceneRendererLoader {
  return async () => {
    const { createCurrentSceneRenderer } = await import('./current-scenes')
    return createCurrentSceneRenderer(theme)
  }
}

const currentDefinitions = {
  'world-cup-2026': {
    seed: 2026,
    layer: 'overlay',
    loadRenderer: loadCurrentScene('world-cup-2026'),
  },
  kawaii: {
    seed: 711,
    layer: 'overlay',
    loadRenderer: loadCurrentScene('kawaii'),
  },
  'neon-city': {
    seed: 404,
    layer: 'overlay',
    loadRenderer: loadCurrentScene('neon-city'),
  },
  storybook: {
    seed: 812,
    layer: 'overlay',
    loadRenderer: loadCurrentScene('storybook'),
  },
  'web-city': {
    seed: 616,
    layer: 'full',
    loadRenderer: loadCurrentScene('web-city'),
  },
  'deep-space': {
    seed: 9001,
    layer: 'full',
    loadRenderer: loadCurrentScene('deep-space'),
  },
  'midnight-cinema': {
    seed: 1313,
    layer: 'full',
    loadRenderer: loadCurrentScene('midnight-cinema'),
  },
  underwater: {
    seed: 20200,
    layer: 'full',
    loadRenderer: loadCurrentScene('underwater'),
  },
} satisfies Record<CurrentLivingTheme, LivingSceneRegistration>

const newDefinitions = {
  'neon-grand-prix': {
    seed: 1986,
    layer: 'full',
    loadRenderer: async () =>
      (await import('./scenes/neon-grand-prix')).neonGrandPrixRenderer,
  },
  'pixel-bomb-arena': {
    seed: 1993,
    layer: 'full',
    loadRenderer: async () =>
      (await import('./scenes/pixel-bomb-arena')).pixelBombArenaRenderer,
  },
  'shadow-dojo': {
    seed: 1992,
    layer: 'full',
    loadRenderer: async () =>
      (await import('./scenes/shadow-dojo')).shadowDojoRenderer,
  },
  'wasteland-rooftops': {
    seed: 2088,
    layer: 'full',
    loadRenderer: async () =>
      (await import('./scenes/wasteland-rooftops')).wastelandRooftopsRenderer,
  },
  'enchanted-kingdom': {
    seed: 1717,
    layer: 'full',
    loadRenderer: async () =>
      (await import('./scenes/enchanted-kingdom')).enchantedKingdomRenderer,
  },
  'starfighter-battle': {
    seed: 4242,
    layer: 'full',
    loadRenderer: async () =>
      (await import('./scenes/starfighter-battle')).starfighterBattleRenderer,
  },
  'moonlit-liner': {
    seed: 1912,
    layer: 'full',
    loadRenderer: async () =>
      (await import('./scenes/moonlit-liner')).moonlitLinerRenderer,
  },
  'castaway-island': {
    seed: 2000,
    layer: 'full',
    loadRenderer: async () =>
      (await import('./scenes/castaway-island')).castawayIslandRenderer,
  },
  'family-noir': {
    seed: 1972,
    layer: 'full',
    loadRenderer: async () =>
      (await import('./scenes/family-noir')).familyNoirRenderer,
  },
} satisfies Record<
  (typeof NEW_LIVING_THEME_IDS)[number],
  LivingSceneRegistration
>

export const LIVING_SCENE_REGISTRY: Record<
  LivingTheme,
  LivingSceneRegistration
> = {
  ...currentDefinitions,
  ...newDefinitions,
}

const livingThemeIds = new Set<string>(LIVING_THEME_IDS)

export function isLivingTheme(theme: string): theme is LivingTheme {
  return livingThemeIds.has(theme)
}

export function getLivingSceneDefinition(theme: string) {
  return isLivingTheme(theme) ? LIVING_SCENE_REGISTRY[theme] : undefined
}

export function isFullLivingTheme(theme: LivingTheme) {
  return LIVING_SCENE_REGISTRY[theme].layer === 'full'
}

export type { LivingTheme } from './types'
