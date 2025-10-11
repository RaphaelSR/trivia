import clsx from 'clsx'
import type { CSSProperties } from 'react'
import type { TriviaTeam } from '../../modules/trivia/types'

type TeamBadgeProps = {
  team: TriviaTeam
  isActive?: boolean
}

export function TeamBadge({ team, isActive = false }: TeamBadgeProps) {
  const style = {
    '--team-color': team.color,
  } as CSSProperties

  return (
    <span
      className={clsx(
        'inline-flex min-w-[7.5rem] items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors',
        isActive
          ? 'border-transparent bg-[var(--team-color)] text-white shadow-md'
          : 'border-[var(--team-color)] bg-[var(--team-color)]/10 text-[var(--team-color)] font-bold'
      )}
      style={style}
    >
      {team.name}
    </span>
  )
}
