import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { getFilmMetadata } from '../../../data/films'
import { slugify } from '../../../utils/slugify'
import type { TriviaColumn, TriviaQuestionTile, TriviaSession } from '../../trivia/types'

export function useBoardOperations(setSession: Dispatch<SetStateAction<TriviaSession>>) {
  const updateTileState = useCallback((tileId: string, state: TriviaQuestionTile['state']) => {
    setSession((prev) => ({
      ...prev,
      board: prev.board.map((column) => ({
        ...column,
        tiles: column.tiles.map((tile) => (tile.id === tileId ? { ...tile, state } : tile)),
      })),
    }))
  }, [setSession])

  const updateTileContent = useCallback((
    tileId: string,
    updates: Partial<Pick<TriviaQuestionTile, 'question' | 'answer' | 'points'>>,
  ) => {
    setSession((prev) => ({
      ...prev,
      board: prev.board.map((column) => ({
        ...column,
        tiles: column.tiles.map((tile) => (tile.id === tileId ? { ...tile, ...updates } : tile)),
      })),
    }))
  }, [setSession])

  const updateColumnTitle = useCallback((columnId: string, film: string) => {
    setSession((prev) => ({
      ...prev,
      board: prev.board.map((column) => (column.id === columnId ? { ...column, film } : column)),
    }))
  }, [setSession])

  const addFilmColumn = useCallback((displayName = 'Novo Filme') => {
    const metadata = getFilmMetadata(displayName)
    const columnId = `${slugify(displayName)}-${Date.now()}`
    const newColumn: TriviaColumn = {
      id: columnId,
      filmId: metadata.id,
      film: displayName,
      theme: metadata.theme,
      tiles: [],
    }

    setSession((prev) => ({
      ...prev,
      board: [...prev.board, newColumn],
    }))

    return columnId
  }, [setSession])

  const removeFilmColumn = useCallback((columnId: string) => {
    setSession((prev) => ({
      ...prev,
      board: prev.board.filter((column) => column.id !== columnId),
    }))
  }, [setSession])

  const addQuestionTile = useCallback((columnId: string, defaults: Partial<TriviaQuestionTile> = {}) => {
    const tileId = `${columnId}-tile-${Date.now()}`

    setSession((prev) => ({
      ...prev,
      board: prev.board.map((column) => {
        if (column.id !== columnId) return column

        const metadata = column.theme ?? getFilmMetadata(column.film).theme
        const newTile: TriviaQuestionTile = {
          id: tileId,
          film: column.film,
          points: defaults.points ?? 10,
          question: defaults.question ?? 'Nova pergunta',
          answer: defaults.answer ?? '',
          state: 'available',
        }

        return {
          ...column,
          theme: column.theme ?? metadata,
          tiles: [...column.tiles, newTile].sort((a, b) => a.points - b.points),
        }
      }),
    }))

    return tileId
  }, [setSession])

  const removeQuestionTile = useCallback((columnId: string, tileId: string) => {
    setSession((prev) => ({
      ...prev,
      board: prev.board.map((column) =>
        column.id === columnId
          ? { ...column, tiles: column.tiles.filter((tile) => tile.id !== tileId) }
          : column,
      ),
    }))
  }, [setSession])

  return {
    updateTileState,
    updateTileContent,
    updateColumnTitle,
    addFilmColumn,
    removeFilmColumn,
    addQuestionTile,
    removeQuestionTile,
  }
}
