import clsx from 'clsx'
import type { ReactNode } from 'react'

export type SidebarNavVariant = 'default' | 'highlight' | 'danger'

interface SidebarNavItemProps {
  icon: ReactNode
  title: string
  description?: string
  badge?: string
  active?: boolean
  variant?: SidebarNavVariant
  disabled?: boolean
  onClick: () => void
}

export function SidebarNavItem({
  icon,
  title,
  description,
  badge,
  active = false,
  variant = 'default',
  disabled = false,
  onClick,
}: SidebarNavItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={description}
      className={clsx(
        'group flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        active ? 'nav-item-active' : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]',
        variant === 'highlight' && !active && 'border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8',
        variant === 'danger' && !active && 'border-[var(--color-danger)]/15 bg-[var(--color-danger)]/6 hover:bg-[var(--color-danger)]/10',
      )}
    >
      <span
        className={clsx(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs',
          active
            ? 'border-white/10 bg-white/10 text-[var(--color-text)]'
            : variant === 'danger'
              ? 'border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
              : 'border-white/5 bg-black/20 text-[var(--color-primary)]',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--color-text)]">{title}</span>
      {badge ? (
        <span className="shrink-0 rounded-full border border-white/10 bg-white/8 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          {badge}
        </span>
      ) : null}
    </button>
  )
}
