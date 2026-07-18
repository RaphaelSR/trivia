import type { ThemeMode } from '../types/game'

export type ThemeTranslationKey =
  | 'light'
  | 'dark'
  | 'cinema'
  | 'retro'
  | 'matrix'
  | 'brazil'
  | 'easter'
  | 'worldCup2026'
  | 'kawaii'
  | 'neonCity'
  | 'storybook'
  | 'webCity'
  | 'deepSpace'
  | 'midnightCinema'
  | 'underwater'
  | 'neonGrandPrix'
  | 'pixelBombArena'
  | 'shadowDojo'
  | 'wastelandRooftops'
  | 'enchantedKingdom'
  | 'starfighterBattle'
  | 'moonlitLiner'
  | 'castawayIsland'
  | 'familyNoir'

export type ThemeCategory = 'classic' | 'animated' | 'game' | 'cinema'

export type ThemeOption = {
  id: ThemeMode
  translationKey: ThemeTranslationKey
  category: ThemeCategory
  animated: boolean
  cinematic?: boolean
}

/**
 * Catálogo canônico da interface. Onboarding e configurações consomem a mesma
 * lista para que um tema novo nunca apareça em apenas um dos fluxos.
 */
export const THEME_OPTIONS: readonly ThemeOption[] = [
  { id: 'light', translationKey: 'light', category: 'classic', animated: false },
  { id: 'dark', translationKey: 'dark', category: 'classic', animated: false },
  { id: 'cinema', translationKey: 'cinema', category: 'classic', animated: false },
  { id: 'retro', translationKey: 'retro', category: 'classic', animated: false },
  { id: 'matrix', translationKey: 'matrix', category: 'classic', animated: false },
  { id: 'brazil', translationKey: 'brazil', category: 'animated', animated: true },
  { id: 'easter', translationKey: 'easter', category: 'animated', animated: true },
  { id: 'world-cup-2026', translationKey: 'worldCup2026', category: 'animated', animated: true },
  { id: 'kawaii', translationKey: 'kawaii', category: 'animated', animated: true },
  { id: 'neon-city', translationKey: 'neonCity', category: 'animated', animated: true },
  { id: 'storybook', translationKey: 'storybook', category: 'animated', animated: true },
  { id: 'web-city', translationKey: 'webCity', category: 'game', animated: true, cinematic: true },
  { id: 'deep-space', translationKey: 'deepSpace', category: 'cinema', animated: true, cinematic: true },
  { id: 'midnight-cinema', translationKey: 'midnightCinema', category: 'cinema', animated: true, cinematic: true },
  { id: 'underwater', translationKey: 'underwater', category: 'cinema', animated: true, cinematic: true },
  { id: 'neon-grand-prix', translationKey: 'neonGrandPrix', category: 'game', animated: true, cinematic: true },
  { id: 'pixel-bomb-arena', translationKey: 'pixelBombArena', category: 'game', animated: true, cinematic: true },
  { id: 'shadow-dojo', translationKey: 'shadowDojo', category: 'game', animated: true, cinematic: true },
  { id: 'wasteland-rooftops', translationKey: 'wastelandRooftops', category: 'game', animated: true, cinematic: true },
  { id: 'enchanted-kingdom', translationKey: 'enchantedKingdom', category: 'game', animated: true, cinematic: true },
  { id: 'starfighter-battle', translationKey: 'starfighterBattle', category: 'game', animated: true, cinematic: true },
  { id: 'moonlit-liner', translationKey: 'moonlitLiner', category: 'cinema', animated: true, cinematic: true },
  { id: 'castaway-island', translationKey: 'castawayIsland', category: 'cinema', animated: true, cinematic: true },
  { id: 'family-noir', translationKey: 'familyNoir', category: 'cinema', animated: true, cinematic: true },
] as const

export const THEME_MODES: ThemeMode[] = THEME_OPTIONS.map((option) => option.id)

export function getThemeOption(theme: ThemeMode): ThemeOption {
  return THEME_OPTIONS.find((option) => option.id === theme) ?? THEME_OPTIONS[0]
}

export const DEFAULT_THEME_MODE: ThemeMode = 'light'

export function getDefaultThemeMode(): ThemeMode {
  return DEFAULT_THEME_MODE
}
