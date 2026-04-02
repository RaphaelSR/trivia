import type { CSSProperties } from 'react'
import type { TriviaColumn, TriviaQuestionTile } from '../../modules/trivia/types'
import { TriviaCard } from './TriviaCard'

type TriviaBoardProps = {
  columns: TriviaColumn[]
  onSelectTile?: (tile: TriviaQuestionTile, column: TriviaColumn) => void
  selectedTileId?: string | null
}

export function TriviaBoard({ columns, onSelectTile, selectedTileId = null }: TriviaBoardProps) {
  const columnCount = columns.length || 1
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${columnCount}, minmax(200px, 1fr))`,
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid gap-6" style={gridStyle}>
        {columns.map((column) => {
          const theme = column.theme
          const style = theme
            ? {
                '--film-primary': theme.primary,
                '--film-accent': theme.accent,
                '--film-bg': theme.background,
                '--film-text': theme.text,
              }
            : undefined
          const columnStyle = style as CSSProperties | undefined

          const sortedTiles = [...column.tiles].sort((a, b) => a.points - b.points)

          return (
            <div key={column.id} className="board-column" style={columnStyle}>
              <div className="mb-1 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold uppercase tracking-[0.25em] text-[var(--film-primary)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                    {column.film}
                  </p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--film-text)]/60">
                    {sortedTiles.length} cartas
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--film-text)]/70">
                  {sortedTiles.filter((tile) => tile.state === 'answered').length}/{sortedTiles.length}
                </span>
              </div>
              <div className="grid gap-2">
                {sortedTiles.map((tile) => (
                  <TriviaCard
                    key={tile.id}
                    tile={tile}
                    theme={column.theme}
                    isSelected={selectedTileId === tile.id}
                    onSelect={(selectedTile) => onSelectTile?.(selectedTile, column)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
