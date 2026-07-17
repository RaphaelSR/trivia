import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { getFilmMetadata } from '../../../data/films'
import { slugify } from '../../../utils/slugify'
import type { TriviaColumn, TriviaQuestionTile, TriviaSession } from '../../trivia/types'
import { syncTurnSequenceWithBoard } from '../domain/session'
import { useTranslation } from '@/shared/i18n'

export function useBoardOperations(setSession: Dispatch<SetStateAction<TriviaSession>>) {
  const { t } = useTranslation('game')
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

  const addFilmColumn = useCallback((requestedDisplayName?: string) => {
    const displayName = requestedDisplayName ?? t('library.defaults.film')
    const metadata = getFilmMetadata(displayName)
    // Sufixo aleatório além do timestamp: imports em massa criam várias colunas
    // no mesmo milissegundo, então `Date.now()` sozinho geraria ids colidentes.
    const columnId = `${slugify(displayName)}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const newColumn: TriviaColumn = {
      id: columnId,
      filmId: metadata.id,
      film: displayName,
      theme: metadata.theme,
      tiles: [],
    }

    setSession((prev) => syncTurnSequenceWithBoard(prev, [...prev.board, newColumn]))

    return columnId
  }, [setSession, t])

  const removeFilmColumn = useCallback((columnId: string) => {
    setSession((prev) => syncTurnSequenceWithBoard(
      prev,
      prev.board.filter((column) => column.id !== columnId),
    ))
  }, [setSession])

  const addQuestionTile = useCallback((columnId: string, defaults: Partial<TriviaQuestionTile> = {}) => {
    // Sufixo aleatório é OBRIGATÓRIO: o import em massa adiciona vários tiles
    // no mesmo milissegundo; `${columnId}-tile-${Date.now()}` sozinho colidiria
    // e responder uma carta travaria todas as do filme (ids iguais).
    const tileId = `${columnId}-tile-${Date.now()}-${Math.random().toString(16).slice(2)}`

    setSession((prev) => {
      const nextBoard = prev.board.map((column) => {
        if (column.id !== columnId) return column

        const metadata = column.theme ?? getFilmMetadata(column.film).theme
        const newTile: TriviaQuestionTile = {
          id: tileId,
          film: column.film,
          points: defaults.points ?? 10,
          question: defaults.question ?? t('library.defaults.question'),
          answer: defaults.answer ?? '',
          state: 'available',
        }

        return {
          ...column,
          theme: column.theme ?? metadata,
          tiles: [...column.tiles, newTile].sort((a, b) => a.points - b.points),
        }
      })

      return syncTurnSequenceWithBoard(prev, nextBoard)
    })

    return tileId
  }, [setSession, t])

  /**
   * Substitui TODAS as perguntas de um filme (re-import atualizando valores).
   * Tiles voltam ao estado 'available' — um re-import redefine o conteúdo.
   */
  const replaceColumnTiles = useCallback((columnId: string, defaults: Array<Partial<TriviaQuestionTile>>) => {
    setSession((prev) => {
      const nextBoard = prev.board.map((column) => {
        if (column.id !== columnId) return column
        const tiles: TriviaQuestionTile[] = defaults
          .map((tileDefaults, index) => ({
            id: `${columnId}-tile-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
            film: column.film,
            points: tileDefaults.points ?? 10,
            question: tileDefaults.question ?? t('library.defaults.question'),
            answer: tileDefaults.answer ?? '',
            state: 'available' as const,
          }))
          .sort((a, b) => a.points - b.points)
        return { ...column, tiles }
      })
      return syncTurnSequenceWithBoard(prev, nextBoard)
    })
  }, [setSession, t])

  const removeQuestionTile = useCallback((columnId: string, tileId: string) => {
    setSession((prev) => {
      const nextBoard = prev.board.map((column) =>
        column.id === columnId
          ? { ...column, tiles: column.tiles.filter((tile) => tile.id !== tileId) }
          : column,
      )

      return syncTurnSequenceWithBoard(prev, nextBoard)
    })
  }, [setSession])

  return {
    updateTileState,
    updateTileContent,
    updateColumnTitle,
    addFilmColumn,
    removeFilmColumn,
    addQuestionTile,
    replaceColumnTiles,
    removeQuestionTile,
  }
}
