import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ReactNode } from 'react'

interface ControlSidebarProps {
  collapsed?: boolean
  mobileOpen?: boolean
  onToggleCollapsed: () => void
  onCloseMobile: () => void
  title: string
  children: ReactNode
}

function SidebarBody({ collapsed, title, onToggleCollapsed, children }: Omit<ControlSidebarProps, 'mobileOpen' | 'onCloseMobile'>) {
  return (
    <aside className="sidebar-surface flex h-full flex-col p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/12 pb-2">
        {!collapsed ? (
          <p className="truncate text-xs font-semibold text-[var(--sidebar-active-text)]">{title}</p>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          aria-label="Alternar menu lateral"
          className="ml-auto text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]"
        >
          <Menu size={14} />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">{children}</div>
    </aside>
  )
}

export function ControlSidebar(props: ControlSidebarProps) {
  return (
    <>
      <SidebarBody {...props} />
      {props.mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-[var(--color-overlay)]/95 xl:hidden" onClick={props.onCloseMobile}>
          <div className="absolute inset-y-0 left-0 w-[80vw] max-w-[280px] p-2" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-surface flex h-full flex-col rounded-2xl p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/12 pb-2">
                <p className="truncate text-xs font-semibold text-[var(--sidebar-active-text)]">{props.title}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={props.onCloseMobile}
                  aria-label="Fechar menu lateral"
                  className="text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]"
                >
                  <X size={14} />
                </Button>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">{props.children}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
