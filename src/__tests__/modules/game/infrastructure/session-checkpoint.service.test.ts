/**
 * Tests for session-checkpoint.service — ring buffer local de estados
 * por jogada (localStorage via jsdom).
 */

import {
  saveCheckpoint,
  listCheckpoints,
  clearCheckpoints,
  describeMove,
} from '@/modules/game/infrastructure/session-checkpoint.service'
import type { GameEvent, TriviaSession } from '@/modules/trivia/types'

function makeSession(id: string, overrides: Partial<TriviaSession> = {}): TriviaSession {
  return {
    id,
    title: 'Partida teste',
    scheduledAt: '2026-07-06T00:00:00.000Z',
    theme: {
      id: 'd',
      name: 'D',
      palette: { background: '#000', primary: '#fff', secondary: '#a', accent: '#b', surface: '#c' },
    },
    teams: [],
    participants: [],
    board: [],
    activeTeamId: '',
    activeParticipantId: null,
    activeTurnIndex: 0,
    turnSequence: [],
    mimicaScores: [],
    ...overrides,
  }
}

function makeEvent(overrides: Partial<GameEvent> = {}): GameEvent {
  return {
    id: 'ev-1',
    type: 'trivia-award',
    timestamp: '2026-07-06T00:00:00.000Z',
    source: 'trivia',
    film: 'Matrix',
    pointsAwarded: 10,
    teamId: 'team-1',
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('session-checkpoint.service', () => {
  it('lista vazia quando não há checkpoints', () => {
    expect(listCheckpoints('sess-1')).toEqual([])
  })

  it('salva e lista com o mais recente primeiro', () => {
    saveCheckpoint(makeSession('sess-1', { title: 'Estado A' }), 'Antes da jogada 1')
    saveCheckpoint(makeSession('sess-1', { title: 'Estado B' }), 'Antes da jogada 2')

    const list = listCheckpoints('sess-1')
    expect(list).toHaveLength(2)
    expect(list[0].label).toBe('Antes da jogada 2')
    expect(list[0].session.title).toBe('Estado B')
    expect(list[1].label).toBe('Antes da jogada 1')
  })

  it('ring buffer: mantém no máximo 15 estados', () => {
    for (let i = 0; i < 20; i++) {
      saveCheckpoint(makeSession('sess-1'), `Antes da jogada ${i}`)
    }
    const list = listCheckpoints('sess-1')
    expect(list).toHaveLength(15)
    expect(list[0].label).toBe('Antes da jogada 19')
    expect(list[14].label).toBe('Antes da jogada 5')
  })

  it('poda checkpoints de OUTRAS sessões ao salvar (quota do localStorage)', () => {
    saveCheckpoint(makeSession('sess-antiga'), 'Antes de algo')
    expect(listCheckpoints('sess-antiga')).toHaveLength(1)

    saveCheckpoint(makeSession('sess-nova'), 'Antes de outra coisa')

    expect(listCheckpoints('sess-nova')).toHaveLength(1)
    expect(listCheckpoints('sess-antiga')).toEqual([])
  })

  it('clearCheckpoints remove o buffer da sessão', () => {
    saveCheckpoint(makeSession('sess-1'), 'Antes')
    clearCheckpoints('sess-1')
    expect(listCheckpoints('sess-1')).toEqual([])
  })

  it('não mistura buffers de sessões diferentes na leitura', () => {
    saveCheckpoint(makeSession('sess-1'), 'Da sessão 1')
    expect(listCheckpoints('sess-2')).toEqual([])
  })
})

describe('describeMove', () => {
  it('acerto de trivia: filme e pontos', () => {
    expect(describeMove(makeEvent())).toBe('Antes de responder Matrix (10 pts)')
  })

  it('anulação: sem pontos no rótulo', () => {
    expect(describeMove(makeEvent({ type: 'trivia-void', pointsAwarded: 0 }))).toBe(
      'Antes de anular Matrix',
    )
  })

  it('mímica: rótulo próprio', () => {
    expect(describeMove(makeEvent({ source: 'mimica', type: 'mimica-award', film: undefined, pointsAwarded: 15 }))).toBe(
      'Antes da mímica (15 pts)',
    )
  })

  it('sem filme: fallback genérico', () => {
    expect(describeMove(makeEvent({ film: undefined }))).toBe('Antes de responder uma pergunta (10 pts)')
  })

  it('sem evento (ajuste manual): fallback', () => {
    expect(describeMove(undefined)).toBe('Antes de um ajuste no placar')
  })
})
