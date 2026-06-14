import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useScoreOperations } from '@/modules/game/application/useScoreOperations'
import type { TriviaSession } from '@/modules/trivia/types'

function makeSession(): TriviaSession {
  return {
    id: 's1',
    title: 'T',
    scheduledAt: new Date('2026-01-01').toISOString(),
    theme: {
      id: 'default',
      name: 'Default',
      palette: { background: '#000', primary: '#fff', secondary: '#aaa', accent: '#bbb', surface: '#ccc' },
    },
    teams: [{ id: 't1', name: 'A', color: '#000', order: 0, members: ['p1'], score: 0 }],
    participants: [{ id: 'p1', name: 'P', role: 'player', teamId: 't1' }],
    board: [
      {
        id: 'c1',
        filmId: 'f1',
        film: 'Filme',
        tiles: [
          { id: 'q1', film: 'Filme', points: 10, state: 'available', question: 'Q1', answer: 'A1' },
          { id: 'q2', film: 'Filme', points: 20, state: 'available', question: 'Q2', answer: 'A2' },
        ],
      },
    ],
    activeTeamId: 't1',
    activeParticipantId: 'p1',
    activeTurnIndex: 0,
    turnSequence: ['p1'],
  }
}

function useHarness() {
  const [session, setSession] = useState<TriviaSession>(makeSession)
  const ops = useScoreOperations(setSession)
  return { session, ops }
}

describe('useScoreOperations — eventLog append-only (T1)', () => {
  it('awardPoints registra evento trivia-award + answeredBy + soma no placar', () => {
    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.ops.awardPoints('q1', 't1', 'p1', 10)
    })

    const s = result.current.session
    expect(s.teams[0].score).toBe(10)
    const tile = s.board[0].tiles.find((t) => t.id === 'q1')!
    expect(tile.state).toBe('answered')
    expect(tile.answeredBy?.pointsAwarded).toBe(10)

    expect(s.eventLog).toHaveLength(1)
    expect(s.eventLog![0]).toMatchObject({
      type: 'trivia-award',
      source: 'trivia',
      tileId: 'q1',
      film: 'Filme',
      basePoints: 10,
      pointsAwarded: 10,
      participantId: 'p1',
      teamId: 't1',
      turnNumber: 0,
      roundNumber: 1,
    })
    expect(s.eventLog![0].id).toBeTruthy()
    expect(s.eventLog![0].timestamp).toBeTruthy()
  })

  it('voidQuestion marca a carta como answered SEM pontos e registra trivia-void', () => {
    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.ops.voidQuestion('q1', 'p1', 't1')
    })

    const s = result.current.session
    expect(s.teams[0].score).toBe(0) // anulação não soma
    const tile = s.board[0].tiles.find((t) => t.id === 'q1')!
    expect(tile.state).toBe('answered')
    expect(tile.answeredBy).toBeUndefined() // sem atribuição de pontos
    expect(s.eventLog).toHaveLength(1)
    expect(s.eventLog![0]).toMatchObject({ type: 'trivia-void', tileId: 'q1', pointsAwarded: 0 })
  })

  it('awardMimicaPoints registra mimica-award + soma no placar + mimicaScores', () => {
    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.ops.awardMimicaPoints('p1', 't1', 15, 1, 1, 'full-current')
    })

    const s = result.current.session
    expect(s.teams[0].score).toBe(15)
    expect(s.mimicaScores).toHaveLength(1)
    expect(s.eventLog).toHaveLength(1)
    expect(s.eventLog![0]).toMatchObject({ type: 'mimica-award', source: 'mimica', pointsAwarded: 15, teamId: 't1', turnNumber: 1, roundNumber: 1 })
  })

  it('é append-only: ações sucessivas acumulam (nunca sobrescreve) e geram ids únicos', () => {
    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.ops.awardPoints('q1', 't1', 'p1', 10)
    })
    act(() => {
      result.current.ops.voidQuestion('q2', 'p1', 't1')
    })

    const s = result.current.session
    expect(s.eventLog).toHaveLength(2)
    expect(s.eventLog!.map((e) => e.type)).toEqual(['trivia-award', 'trivia-void'])
    expect(new Set(s.eventLog!.map((e) => e.id)).size).toBe(2) // ids únicos
  })
})
