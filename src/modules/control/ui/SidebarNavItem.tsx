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
        active
          ? 'nav-item-active'
          : 'border-white/10 bg-white/[0.035] hover:border-white/18 hover:bg-white/[0.06] hover:shadow-[0_12px_28px_-18px_rgba(0,0,0,0.8)]',
        variant === 'highlight' && !active && 'border-[color:color-mix(in_srgb,var(--color-primary)_38%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_14%,transparent)]',
        variant === 'danger' && !active && 'border-[color:color-mix(in_srgb,var(--color-danger)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--color-danger)_10%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--color-danger)_14%,transparent)]',
      )}
    >
      <span
        className={clsx(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs transition-colors duration-150',
          active
            ? 'border-white/15 bg-white/12 text-[var(--sidebar-active-text)]'
            : variant === 'danger'
              ? 'border-[color:color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[color:color-mix(in_srgb,var(--color-danger)_82%,white_18%)]'
              : 'border-white/10 bg-black/24 text-[color:color-mix(in_srgb,var(--color-primary)_74%,white_26%)] group-hover:text-[color:color-mix(in_srgb,var(--color-primary)_58%,white_42%)]',
        )}
      >
        {icon}
      </span>
      <span
        className={clsx(
          'min-w-0 flex-1 truncate text-xs font-semibold transition-colors duration-150',
          active ? 'text-[var(--sidebar-active-text)]' : 'text-[var(--sidebar-text)] group-hover:text-[var(--sidebar-active-text)]',
        )}
      >
        {title}
      </span>
      {badge ? (
        <span className="shrink-0 rounded-full border border-white/12 bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--sidebar-badge-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {badge}
        </span>
      ) : null}
    </button>
  )
}
