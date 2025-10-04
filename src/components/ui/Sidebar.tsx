import clsx from 'clsx'
import type { ReactNode } from 'react'

type SidebarProps = {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function Sidebar({ title, description, children, className }: SidebarProps) {
  return (
    <aside
      className={clsx(
        'card-surface flex w-full flex-col gap-6 rounded-3xl p-6 lg:w-80',
        className
      )}
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
        {description ? <p className="text-sm text-[var(--color-muted)]">{description}</p> : null}
      </div>
      {children}
    </aside>
  )
}
