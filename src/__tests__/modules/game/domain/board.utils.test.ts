import { countAnsweredTiles, countTotalTiles, getAvailableTiles, isGameFinished } from '@/modules/game/domain/board.utils'
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
})
