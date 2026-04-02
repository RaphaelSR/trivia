import type { ReactNode } from 'react'
import clsx from 'clsx'

interface GameLayoutProps {
  children: ReactNode
  className?: string
}

export function GameLayout({ children, className }: GameLayoutProps) {
  return (
    <main
      className={clsx(
        'min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_24%),var(--color-surface)] px-4 py-6 sm:px-6 lg:px-8',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
    </main>
  )
}
