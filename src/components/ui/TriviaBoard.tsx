import type { CSSProperties } from 'react'
import type { TriviaColumn, TriviaQuestionTile } from '../../modules/trivia/types'
import { TriviaCard } from './TriviaCard'

type TriviaBoardProps = {
  columns: TriviaColumn[]
  onSelectTile?: (tile: TriviaQuestionTile, column: TriviaColumn) => void
}

export function TriviaBoard({ columns, onSelectTile }: TriviaBoardProps) {
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

          return (
            <div key={column.id} className="board-column" style={columnStyle}>
              <h4 className="text-center text-sm font-semibold text-[var(--film-text)] uppercase tracking-[0.35em]">
                {column.film}
              </h4>
              <div className="grid gap-2">
                {column.tiles.map((tile) => (
                  <TriviaCard
                    key={tile.id}
                    tile={tile}
                    theme={column.theme}
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
