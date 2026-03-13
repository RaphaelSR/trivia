import clsx from 'clsx'
import type { ReactNode } from 'react'

interface StatPillProps {
  label: string
  value: string
  icon?: ReactNode
  className?: string
}

export function StatPill({ label, value, icon, className }: StatPillProps) {
  return (
    <div className={clsx('inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-left', className)}>
      {icon ? <span className="text-[var(--color-primary)]">{icon}</span> : null}
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-muted)]">{label}</p>
        <p className="text-sm font-semibold text-[var(--color-text)]">{value}</p>
      </div>
    </div>
  )
}
