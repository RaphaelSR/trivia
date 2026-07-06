import type { ThemeMode } from '../types/game'

export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'cinema', 'retro', 'matrix', 'brazil', 'easter']

export const DEFAULT_THEME_MODE: ThemeMode = 'dark'

// Regra temporária: tema Brasil como padrão até o fim da Copa do Mundo 2026.
// Após essa data o padrão volta a ser DEFAULT_THEME_MODE; remover quando expirar.
export const SEASONAL_THEME_MODE: ThemeMode = 'brazil'
export const SEASONAL_THEME_END = new Date('2026-08-01T00:00:00')

export function getDefaultThemeMode(now: Date = new Date()): ThemeMode {
  return now < SEASONAL_THEME_END ? SEASONAL_THEME_MODE : DEFAULT_THEME_MODE
}
