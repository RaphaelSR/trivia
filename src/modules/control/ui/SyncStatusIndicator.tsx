/**
 * SyncStatusIndicator
 *
 * Compact Google-Docs-style sync status badge for the control topbar.
 * Purely presentational — driven by CloudSyncStatus from useCloudSync.
 *
 * Only rendered when gameMode !== 'demo' (enforced by the caller).
 */

import { Check, Cloud, CloudOff, Loader2 } from 'lucide-react'
import type { CloudSyncStatus } from '@/modules/game/application/useCloudSync'

interface SyncStatusIndicatorProps {
  status: CloudSyncStatus
}

interface StatusConfig {
  icon: React.ReactNode
  text: string
  className: string
}

function getConfig(status: CloudSyncStatus): StatusConfig {
  switch (status) {
    case 'syncing':
      return {
        icon: <Loader2 size={12} className="animate-spin shrink-0" />,
        text: 'Salvando…',
        className: 'text-[var(--color-primary)]',
      }
    case 'synced':
      return {
        icon: <Check size={12} className="shrink-0" />,
        text: 'Salvo na sua conta',
        className: 'text-[var(--color-primary)]',
      }
    case 'pending':
      return {
        icon: <CloudOff size={12} className="shrink-0" />,
        text: 'Salvo neste navegador · sincroniza ao reconectar',
        className: 'text-[var(--color-muted)]',
      }
    case 'local-only':
    default:
      return {
        icon: <Cloud size={12} className="shrink-0 opacity-60" />,
        text: 'Salvo neste navegador',
        className: 'text-[var(--color-muted)]',
      }
  }
}

export function SyncStatusIndicator({ status }: SyncStatusIndicatorProps) {
  const config = getConfig(status)

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`flex items-center gap-1.5 rounded-full border border-white/8 bg-black/15 px-2.5 py-1 backdrop-blur-sm ${config.className}`}
    >
      {config.icon}
      <span className="hidden text-[10px] font-medium leading-none sm:inline">{config.text}</span>
    </div>
  )
}
