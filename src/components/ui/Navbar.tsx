import { LogOut, Database } from 'lucide-react'
import clsx from 'clsx'
import { Button } from './Button'

type SessionMode = 'controle' | 'exibição'

type NavbarProps = {
  className?: string
  title: string
  mode: SessionMode
  onOpenSessionManager?: () => void
  onExit?: () => void
}

const modeLabels: Record<SessionMode, string> = {
  controle: 'Modo Controle',
  exibição: 'Modo Exibição',
}

export function Navbar({ className, title, mode, onOpenSessionManager, onExit }: NavbarProps) {
  return (
    <header
      className={clsx(
        'card-surface flex h-20 items-center justify-between rounded-none border-b px-8 shadow-none',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="rounded-2xl bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-[var(--color-primary)]">
          Trivia
        </span>
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
            {modeLabels[mode]}
          </span>
          <span className="text-lg font-semibold text-[var(--color-text)]">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" aria-label="Gerenciar sessões" onClick={onOpenSessionManager}>
          <Database size={18} />
        </Button>
        <Button variant="outline" size="icon" aria-label="Sair" onClick={onExit}>
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  )
}
