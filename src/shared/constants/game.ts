import type { GameMode, MimicaScoringMode, TileState } from '../types/game'

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

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  demo: 'Modo Demo',
  offline: 'Sessão Local',
  online: 'Online (interno)',
}

export const GAME_MODE_DESCRIPTIONS: Record<GameMode, string> = {
  demo: 'Apresentacao rapida com dados de exemplo',
  offline: 'Salva por sessao e navegador neste dispositivo',
  online: 'Camada interna reservada para evolucao futura',
}
