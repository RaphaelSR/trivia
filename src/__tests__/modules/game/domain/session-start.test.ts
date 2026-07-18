import {
  compareSessionVersions,
  hasMeaningfulSessionData,
  summarizeSessionStart,
} from '@/modules/game/domain/session-start'
import { createEmptySession } from '@/modules/trivia/utils/createEmptySession'
import type { GameEvent, TriviaSession } from '@/modules/trivia/types'

function event(id: string, type: GameEvent['type'] = 'trivia-award'): GameEvent {
  return {
    id,
    type,
    source: type === 'mimica-award' ? 'mimica' : 'trivia',
    timestamp: `2026-07-17T10:0${id.length}:00.000Z`,
    pointsAwarded: type === 'trivia-void' ? 0 : 10,
    teamId: 'team-a',
    film: 'Matrix',
  }
}

function session(overrides: Partial<TriviaSession> = {}): TriviaSession {
  return { ...createEmptySession({ title: 'Teste' }), id: 'same-session', ...overrides }
}

describe('session-start domain', () => {
  it('nunca compara partidas com IDs diferentes como versões da mesma sessão', () => {
    const local = session({ id: 'new-game', eventLog: [] })
    const cloud = session({ id: 'old-game', eventLog: [event('old-1'), event('old-2')] })

    expect(compareSessionVersions(local, cloud, '2026-07-17T09:00:00Z', '2026-07-17T12:00:00Z'))
      .toBe('different-sessions')
  })

  it('prefere o log local quando ele contém todo o log da nuvem', () => {
    const first = event('one')
    const local = session({ eventLog: [first, event('two')] })
    const cloud = session({ eventLog: [first] })

    expect(compareSessionVersions(local, cloud, '2026-07-17T08:00:00Z', '2026-07-17T12:00:00Z'))
      .toBe('local-ahead')
  })

  it('prefere o log da nuvem quando ele contém todo o local', () => {
    const first = event('one')
    expect(compareSessionVersions(
      session({ eventLog: [first] }),
      session({ eventLog: [first, event('two')] }),
    )).toBe('cloud-ahead')
  })

  it('marca conflito quando os logs da mesma partida divergiram', () => {
    expect(compareSessionVersions(
      session({ eventLog: [event('local')] }),
      session({ eventLog: [event('cloud')] }),
    )).toBe('conflict')
  })

  it('usa progresso e timestamp apenas dentro da mesma identidade', () => {
    const local = session({ eventLog: undefined })
    const cloud = session({ eventLog: undefined })
    expect(compareSessionVersions(local, cloud, '2026-07-17T12:00:00Z', '2026-07-17T10:00:00Z'))
      .toBe('local-ahead')
  })

  it('distingue rascunho vazio de uma partida com elenco e resume dados úteis', () => {
    const empty = session()
    const configured = session({
      teams: [{ id: 'team-a', name: 'A', color: '#fff', order: 0, members: ['p1'], score: 10 }],
      participants: [{ id: 'p1', name: 'Ana', role: 'player', teamId: 'team-a' }],
      eventLog: [event('one')],
    })

    expect(hasMeaningfulSessionData(empty)).toBe(false)
    expect(hasMeaningfulSessionData(configured)).toBe(true)
    expect(summarizeSessionStart(configured)).toMatchObject({
      teams: 1,
      participants: 1,
      score: 10,
      lastEvent: { id: 'one' },
    })
  })
})
