import type { TriviaColumn, TriviaQuestionTile } from '../../trivia/types'

export function countTotalTiles(board: TriviaColumn[]): number {
  return board.reduce((acc, column) => acc + column.tiles.length, 0)
}

export function countAnsweredTiles(board: TriviaColumn[]): number {
  return board.reduce(
    (acc, column) => acc + column.tiles.filter((tile) => tile.state === 'answered').length,
    0,
  )
}

export function getAvailableTiles(board: TriviaColumn[]): TriviaQuestionTile[] {
  return board.flatMap((column) => column.tiles.filter((tile) => tile.state === 'available'))
}

export function isGameFinished(board: TriviaColumn[]): boolean {
  const totalTiles = countTotalTiles(board)
  return totalTiles > 0 && countAnsweredTiles(board) === totalTiles
}
