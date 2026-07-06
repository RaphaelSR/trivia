import { countAnsweredTiles, countTotalTiles, dedupeTileIds, getAvailableTiles, isGameFinished, releaseActiveTiles } from '@/modules/game/domain/board.utils'
import type { TriviaColumn } from '@/modules/trivia/types'

const board: TriviaColumn[] = [
  {
    id: 'col-1',
    filmId: 'film-1',
    film: 'Film 1',
    tiles: [
      { id: 't1', film: 'Film 1', points: 10, state: 'available', question: 'Q1', answer: 'A1' },
      { id: 't2', film: 'Film 1', points: 20, state: 'answered', question: 'Q2', answer: 'A2' },
    ],
  },
  {
    id: 'col-2',
    filmId: 'film-2',
    film: 'Film 2',
    tiles: [
      { id: 't3', film: 'Film 2', points: 30, state: 'answered', question: 'Q3', answer: 'A3' },
    ],
  },
]

describe('board.utils', () => {
  it('counts total and answered tiles', () => {
    expect(countTotalTiles(board)).toBe(3)
    expect(countAnsweredTiles(board)).toBe(2)
  })

  it('returns available tiles only', () => {
    expect(getAvailableTiles(board).map((tile) => tile.id)).toEqual(['t1'])
  })

  it('detects finished game only when all tiles are answered', () => {
    expect(isGameFinished(board)).toBe(false)
    expect(
      isGameFinished(
        board.map((column) => ({
          ...column,
          tiles: column.tiles.map((tile) => ({ ...tile, state: 'answered' as const })),
        })),
      ),
    ).toBe(true)
  })

  describe('dedupeTileIds', () => {
    it('is a no-op (same reference) when all tile ids are already unique', () => {
      const session = { board }
      expect(dedupeTileIds(session)).toBe(session)
    })

    it('reassigns duplicate tile ids, keeping the first occurrence and never colliding', () => {
      // Reproduz o bug do import em massa: três cartas do mesmo filme com id idêntico.
      const dupBoard: TriviaColumn[] = [
        {
          id: 'col-x',
          filmId: 'film-x',
          film: 'Film X',
          tiles: [
            { id: 'dup', film: 'Film X', points: 10, state: 'available', question: 'Q1', answer: 'A1' },
            { id: 'dup', film: 'Film X', points: 20, state: 'available', question: 'Q2', answer: 'A2' },
            { id: 'dup', film: 'Film X', points: 30, state: 'available', question: 'Q3', answer: 'A3' },
          ],
        },
      ]
      const result = dedupeTileIds({ board: dupBoard })
      const ids = result.board[0].tiles.map((tile) => tile.id)

      expect(new Set(ids).size).toBe(3) // todos únicos agora
      expect(ids[0]).toBe('dup') // primeira ocorrência preservada
      // conteúdo e estado intactos
      expect(result.board[0].tiles.map((t) => t.question)).toEqual(['Q1', 'Q2', 'Q3'])
      expect(result.board[0].tiles.map((t) => t.answer)).toEqual(['A1', 'A2', 'A3'])
    })

    it('dedupes ids shared across different columns too', () => {
      const crossBoard: TriviaColumn[] = [
        {
          id: 'col-a',
          filmId: 'f-a',
          film: 'A',
          tiles: [{ id: 'shared', film: 'A', points: 10, state: 'available', question: 'Qa', answer: 'Aa' }],
        },
        {
          id: 'col-b',
          filmId: 'f-b',
          film: 'B',
          tiles: [{ id: 'shared', film: 'B', points: 10, state: 'available', question: 'Qb', answer: 'Ab' }],
        },
      ]
      const result = dedupeTileIds({ board: crossBoard })
      expect(result.board[0].tiles[0].id).toBe('shared')
      expect(result.board[1].tiles[0].id).not.toBe('shared')
    })
  })
})

describe('releaseActiveTiles', () => {
  const makeBoard = (states: Array<'available' | 'active' | 'answered'>) => [
    {
      id: 'c1',
      filmId: 'f1',
      film: 'F',
      tiles: states.map((state, i) => ({
        id: `q${i}`,
        film: 'F',
        points: 10,
        state,
        question: 'Q',
        answer: 'A',
      })),
    },
  ]

  it('solta cartas presas em active para available', () => {
    const session = { board: makeBoard(['active', 'answered', 'available']) }
    const healed = releaseActiveTiles(session)
    expect(healed.board[0].tiles.map((t) => t.state)).toEqual(['available', 'answered', 'available'])
  })

  it('preserva answered e available intactos', () => {
    const session = { board: makeBoard(['answered', 'available']) }
    const healed = releaseActiveTiles(session)
    expect(healed.board[0].tiles.map((t) => t.state)).toEqual(['answered', 'available'])
  })

  it('retorna a MESMA referência quando nada muda (não dispara re-render)', () => {
    const session = { board: makeBoard(['answered', 'available']) }
    expect(releaseActiveTiles(session)).toBe(session)
  })

  it('só recria as colunas que tinham carta active', () => {
    const session = {
      board: [...makeBoard(['active']), ...makeBoard(['available']).map((c) => ({ ...c, id: 'c2' }))],
    }
    const healed = releaseActiveTiles(session)
    expect(healed.board[0]).not.toBe(session.board[0])
    expect(healed.board[1]).toBe(session.board[1])
  })
})
