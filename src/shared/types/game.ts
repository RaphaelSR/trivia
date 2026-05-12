export type GameMode = 'demo' | 'offline' | 'online'

export type ThemeMode = 'light' | 'dark' | 'cinema' | 'retro' | 'matrix' | 'brazil' | 'easter'

export type TileState = 'available' | 'active' | 'answered'

export type MimicaScoringMode = 'full-current' | 'half-current' | 'steal' | 'everyone' | 'void'

export type DemoSessionConfig = {
  teamCount: number
  membersPerTeam: number
  questionCount: number
}
