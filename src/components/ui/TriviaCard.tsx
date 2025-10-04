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
  onSelect?: (tile: TriviaQuestionTile) => void
}

export function TriviaCard({ tile, theme, onSelect }: TriviaCardProps) {
  const isAvailable = tile.state === 'available'
  const state = tile.state === 'answered' ? 'answered' : tile.state === 'active' ? 'active' : 'default'

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
        !isAvailable && 'cursor-not-allowed'
      )}
      data-state={state}
      style={style}
      disabled={!isAvailable}
      onClick={() => isAvailable && onSelect?.(tile)}
    >
      <span>{tile.points}</span>
      <span className="text-xs font-medium text-[var(--film-text)]/70">pontos</span>
    </button>
  )
}
