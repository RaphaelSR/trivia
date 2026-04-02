import type { ReactNode } from 'react'

interface EmptyStatePanelProps {
  title: string
  description: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyStatePanel({ title, description, icon, action }: EmptyStatePanelProps) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-black/10 px-6 py-10 text-center">
      {icon ? <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[var(--color-primary)]">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--color-muted)]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}
