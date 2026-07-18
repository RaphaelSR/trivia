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

export type ThemeOption = {
  id: ThemeMode
  translationKey: ThemeTranslationKey
  animated: boolean
  cinematic?: boolean
}

/**
 * Catálogo canônico da interface. Onboarding e configurações consomem a mesma
 * lista para que um tema novo nunca apareça em apenas um dos fluxos.
 */
export const THEME_OPTIONS: readonly ThemeOption[] = [
  { id: 'light', translationKey: 'light', animated: false },
  { id: 'dark', translationKey: 'dark', animated: false },
  { id: 'cinema', translationKey: 'cinema', animated: false },
  { id: 'retro', translationKey: 'retro', animated: false },
  { id: 'matrix', translationKey: 'matrix', animated: false },
  { id: 'brazil', translationKey: 'brazil', animated: true },
  { id: 'easter', translationKey: 'easter', animated: true },
  { id: 'world-cup-2026', translationKey: 'worldCup2026', animated: true },
  { id: 'kawaii', translationKey: 'kawaii', animated: true },
  { id: 'neon-city', translationKey: 'neonCity', animated: true },
  { id: 'storybook', translationKey: 'storybook', animated: true },
  { id: 'web-city', translationKey: 'webCity', animated: true, cinematic: true },
  { id: 'deep-space', translationKey: 'deepSpace', animated: true, cinematic: true },
  { id: 'midnight-cinema', translationKey: 'midnightCinema', animated: true, cinematic: true },
  { id: 'underwater', translationKey: 'underwater', animated: true, cinematic: true },
] as const

export const THEME_MODES: ThemeMode[] = THEME_OPTIONS.map((option) => option.id)

export function getThemeOption(theme: ThemeMode): ThemeOption {
  return THEME_OPTIONS.find((option) => option.id === theme) ?? THEME_OPTIONS[0]
}

export const DEFAULT_THEME_MODE: ThemeMode = 'light'

export function getDefaultThemeMode(): ThemeMode {
  return DEFAULT_THEME_MODE
}
