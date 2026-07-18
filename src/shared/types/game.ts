export type GameMode = 'demo' | 'offline' | 'online'

export type ThemeMode =
  | 'light'
  | 'dark'
  | 'cinema'
  | 'retro'
  | 'matrix'
  | 'brazil'
  | 'easter'
  | 'world-cup-2026'
  | 'kawaii'
  | 'neon-city'
  | 'storybook'
  | 'web-city'
  | 'deep-space'
  | 'midnight-cinema'
  | 'underwater'
  | 'neon-grand-prix'
  | 'pixel-bomb-arena'
  | 'shadow-dojo'
  | 'wasteland-rooftops'
  | 'enchanted-kingdom'
  | 'starfighter-battle'
  | 'moonlit-liner'
  | 'castaway-island'
  | 'family-noir'

export type TileState = 'available' | 'active' | 'answered'

export type MimicaScoringMode = 'full-current' | 'half-current' | 'steal' | 'everyone' | 'void'

export type DemoSessionConfig = {
  teamCount: number
  membersPerTeam: number
  questionCount: number
}
