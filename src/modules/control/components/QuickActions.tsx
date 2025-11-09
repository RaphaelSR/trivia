import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

export type QuickAction = {
  id: string
  icon: ReactNode
  label: string
  description: string
  onClick: () => void
  disabled?: boolean
}

type QuickActionsProps = {
  actions: QuickAction[]
}

/**
 * Componente para exibir ações rápidas
 */
export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 shadow-sm">
        {/* Timer será renderizado aqui pelo componente pai */}
      </div>
      {actions.map((action) => (
        <div key={action.id} className="relative group">
          <Button
            variant="ghost"
            size="icon"
            aria-label={action.label}
            title={action.label}
            onClick={action.onClick}
            disabled={action.disabled}
            className="w-full h-full"
          >
            {action.icon}
          </Button>
          <div className="tooltip">
            <div className="font-semibold">{action.label}</div>
            <div className="text-xs opacity-90 mt-1">{action.description}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

