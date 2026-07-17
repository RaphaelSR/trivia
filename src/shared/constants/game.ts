import type { DemoSessionConfig, GameMode, MimicaScoringMode, TileState } from '../types/game'

export const GAME_MODES: GameMode[] = ['demo', 'offline', 'online']

export const DEFAULT_GAME_MODE: GameMode = 'demo'

export const MAX_SESSION_HISTORY = 20
export const MAX_ROULETTE_HISTORY = 10

export const TILE_STATES: TileState[] = ['available', 'active', 'answered']

export const MIMICA_SCORING_MODES: MimicaScoringMode[] = [
  'full-current',
  'half-current',
  'steal',
  'everyone',
  'void',
]

export const DEMO_TEAM_OPTIONS = [3, 4, 5] as const
export const DEMO_MEMBERS_PER_TEAM_OPTIONS = [3, 4, 5] as const
export const DEMO_QUESTION_OPTIONS = [9, 18, 27] as const

export const DEFAULT_DEMO_SESSION_CONFIG: DemoSessionConfig = {
  teamCount: 3,
  membersPerTeam: 3,
  questionCount: 27,
}
