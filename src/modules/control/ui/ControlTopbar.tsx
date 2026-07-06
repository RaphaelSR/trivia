import { Cloud, Database, HardDrive, LogOut, Menu, MonitorPlay, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { CloudSyncStatus } from '@/modules/game/application/useCloudSync'
import { SyncStatusIndicator } from './SyncStatusIndicator'

interface ControlTopbarProps {
  title: string
  modeLabel: string
  mode: 'demo' | 'offline' | 'online'
  syncStatus?: CloudSyncStatus
  lastSyncedAt?: string | null
  onForceSync?: () => void
  onOpenSessions: () => void
  onExit: () => void
  onToggleSidebar: () => void
  /** Quando definido, exibe o botão de conta ao lado do Database. */
  onOpenAccount?: () => void
}

const modeIcons = {
  demo: MonitorPlay,
  offline: HardDrive,
  online: Cloud,
}

const modeBgClasses = {
  demo: 'bg-[var(--color-secondary)]/15 text-[var(--color-secondary)] border-[var(--color-secondary)]/30',
  offline: 'bg-[var(--color-primary)]/12 text-[var(--color-primary)] border-[var(--color-primary)]/24',
  online: 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30',
}

export function ControlTopbar({ title, modeLabel, mode, syncStatus, lastSyncedAt, onForceSync, onOpenSessions, onExit, onToggleSidebar, onOpenAccount }: ControlTopbarProps) {
  const ModeIcon = modeIcons[mode]

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/8 bg-[var(--glass-bg)]/95 px-3 backdrop-blur-xl lg:px-4">
      <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="xl:hidden" aria-label="Abrir menu lateral">
        <Menu size={16} />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <ModeIcon size={14} data-testid={`mode-icon-${mode}`} className="shrink-0 text-[var(--color-primary)]" />
        <span className="truncate text-sm font-semibold text-[var(--color-text)]">{title}</span>
        <span className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-flex ${modeBgClasses[mode]}`}>
          {modeLabel}
        </span>
      </div>

      {/* Sync indicator — only shown when syncStatus is provided (non-demo modes) */}
      {syncStatus !== undefined ? (
        <SyncStatusIndicator status={syncStatus} onForceSync={onForceSync} lastSyncedAt={lastSyncedAt} />
      ) : null}

      <div className="flex shrink-0 items-center gap-1.5">
        {onOpenAccount !== undefined ? (
          <Button variant="ghost" size="icon" aria-label="Minha conta" onClick={onOpenAccount}>
            <UserCircle size={15} />
          </Button>
        ) : null}
        <Button variant="ghost" size="icon" aria-label="Gerenciar sessões" onClick={onOpenSessions}>
          <Database size={15} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Encerrar contexto" onClick={onExit}>
          <LogOut size={15} />
        </Button>
      </div>
    </header>
  )
}
