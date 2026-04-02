import clsx from 'clsx'
import type { HTMLAttributes } from 'react'

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('glass-card rounded-[28px]', className)} {...props} />
}
