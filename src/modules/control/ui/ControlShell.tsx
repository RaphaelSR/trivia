import type { ReactNode } from 'react'
import clsx from 'clsx'

interface ControlShellProps {
  topbar: ReactNode
  statusStrip?: ReactNode
  sidebar: ReactNode
  children: ReactNode
  sidebarCollapsed?: boolean
}

export function ControlShell({ topbar, statusStrip, sidebar, children, sidebarCollapsed = false }: ControlShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-background)]">
      {topbar}
      {statusStrip}
      <div className="flex min-h-0 flex-1">
        <div className={clsx('hidden shrink-0 xl:block', sidebarCollapsed ? 'xl:w-[64px]' : 'xl:w-[220px]')}>
          {sidebar}
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto p-3 lg:p-4">
          {children}
        </main>
      </div>
    </div>
  )
}
