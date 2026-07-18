import type { ThemeMode } from '@/shared/types/game'

export type AmbientProfile =
  | 'neutral'
  | 'stadium'
  | 'soft'
  | 'city'
  | 'forest'
  | 'space'
  | 'cinema-rain'
  | 'underwater'
  | 'race'
  | 'arcade'
  | 'dojo'
  | 'wasteland'
  | 'fantasy'
  | 'ocean'
  | 'island'
  | 'noir'

export const THEME_AUDIO_PROFILES: Record<ThemeMode, AmbientProfile> = {
  light: 'neutral',
  dark: 'neutral',
  cinema: 'cinema-rain',
  retro: 'arcade',
  matrix: 'city',
  brazil: 'stadium',
  easter: 'forest',
  'world-cup-2026': 'stadium',
  kawaii: 'soft',
  'neon-city': 'city',
  storybook: 'forest',
  'web-city': 'city',
  'deep-space': 'space',
  'midnight-cinema': 'cinema-rain',
  underwater: 'underwater',
  'neon-grand-prix': 'race',
  'pixel-bomb-arena': 'arcade',
  'shadow-dojo': 'dojo',
  'wasteland-rooftops': 'wasteland',
  'enchanted-kingdom': 'fantasy',
  'starfighter-battle': 'space',
  'moonlit-liner': 'ocean',
  'castaway-island': 'island',
  'family-noir': 'noir',
}
