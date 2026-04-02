import clsx from 'clsx'
import type { CSSProperties } from 'react'
import type { TriviaQuestionTile } from '../../modules/trivia/types'

type TriviaCardProps = {
  tile: TriviaQuestionTile
  theme?: {
    primary: string
    accent: string
    background: string
    text: string
  }
  isSelected?: boolean
  onSelect?: (tile: TriviaQuestionTile) => void
}

export function TriviaCard({ tile, theme, isSelected = false, onSelect }: TriviaCardProps) {
  const isAvailable = tile.state === 'available'
  const state = tile.state === 'answered' ? 'answered' : tile.state === 'active' ? 'active' : 'default'
  const label =
    tile.state === 'answered' ? 'respondida' : tile.state === 'active' ? 'ao vivo' : 'pontos'

  const style = theme
    ? ({
        '--film-primary': theme.primary,
        '--film-accent': theme.accent,
        '--film-bg': theme.background,
        '--film-text': theme.text,
      } as CSSProperties)
    : undefined

  return (
    <button
      type="button"
      className={clsx(
        'board-card text-lg font-semibold uppercase tracking-wide',
        isSelected && 'ring-2 ring-[var(--film-accent)] ring-offset-2 ring-offset-[var(--color-background)]',
        !isAvailable && 'cursor-not-allowed opacity-50'
      )}
      data-state={state}
      data-selected={isSelected ? 'true' : 'false'}
      style={style}
      disabled={!isAvailable}
      onClick={() => isAvailable && onSelect?.(tile)}
    >
      <span className="relative z-10 text-3xl font-bold leading-none">{tile.points}</span>
      <span className="relative z-10 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--film-text)]/75">{label}</span>
    </button>
  )
}
