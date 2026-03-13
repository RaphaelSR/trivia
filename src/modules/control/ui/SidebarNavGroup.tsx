import type { ReactNode } from 'react'

interface SidebarNavGroupProps {
  title: string
  children: ReactNode
}

export function SidebarNavGroup({ title, children }: SidebarNavGroupProps) {
  return (
    <section className="space-y-1">
      <div className="px-1 pb-0.5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[var(--color-muted)]">{title}</p>
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  )
}
