import type { GameMode, MimicaScoringMode, TileState } from '../types/game'

export const GAME_MODES: GameMode[] = ['demo', 'offline', 'online']

export const DEFAULT_GAME_MODE: GameMode = 'demo'

export const DEFAULT_PIN = 'password123'

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

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  demo: 'Modo Demo',
  offline: 'Play Offline',
  online: 'Play Online',
}

export const GAME_MODE_DESCRIPTIONS: Record<GameMode, string> = {
  demo: 'Dados de teste pre-configurados',
  offline: 'Criacao local com persistencia no dispositivo',
  online: 'Sessao com repositorio preparado para sincronizacao remota',
}
