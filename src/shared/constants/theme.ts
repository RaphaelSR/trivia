import type { ThemeMode } from '../types/game'

export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'cinema', 'retro', 'matrix', 'brazil', 'easter']

export const DEFAULT_THEME_MODE: ThemeMode = 'light'

export function getDefaultThemeMode(): ThemeMode {
  return DEFAULT_THEME_MODE
}
