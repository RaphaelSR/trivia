import type { ReactNode } from 'react'

interface FloatingActionBarProps {
  children: ReactNode
}

export function FloatingActionBar({ children }: FloatingActionBarProps) {
  return (
    <div
      className="fixed inset-x-4 bottom-4 z-40 rounded-full border border-white/10 p-2 shadow-2xl backdrop-blur-xl md:hidden"
      style={{ backgroundColor: 'var(--glass-bg)' }}
    >
      <div className="flex items-center justify-between gap-2">{children}</div>
    </div>
  )
}
