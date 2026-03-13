import type { GameMode } from '../types/game'

export const STORAGE_KEYS = {
  themeMode: 'trivia-theme-mode',
  onboardingSeen: 'trivia-onboarding-seen',
  customFilms: 'trivia-custom-films',
  rouletteHistory: 'trivia-roulette-history',
  activeSession: 'trivia-active-session',
  sessionHistory: 'trivia-session-history',
  onlineActiveSession: 'trivia-online-active-session',
  onlineSessionHistory: 'trivia-online-session-history',
  pinByMode: (mode: GameMode) => `trivia-pin-${mode}`,
  sessionById: (sessionId: string) => `trivia-session-${sessionId}`,
  onlineSessionById: (sessionId: string) => `trivia-online-session-${sessionId}`,
} as const
