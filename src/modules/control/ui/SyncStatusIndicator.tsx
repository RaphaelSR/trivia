/**
 * SyncStatusIndicator
 *
 * Compact Google-Docs-style sync status badge for the control topbar.
 * Purely presentational — driven by CloudSyncStatus from useCloudSync.
 *
 * Only rendered when gameMode !== 'demo' (enforced by the caller).
 */

import { CheckCheck, CloudUpload, HardDrive, RefreshCw } from 'lucide-react'
import type { CloudSyncStatus } from '@/modules/game/application/useCloudSync'

interface SyncStatusIndicatorProps {
  status: CloudSyncStatus
  /** When provided and status !== 'syncing', the pill becomes a clickable button. */
  onForceSync?: () => void
}

interface StatusConfig {
  icon: React.ReactNode
  text: string
  /** Tooltip nativo (title) que explica o estado — responde "o que isso significa?". */
  title: string
  className: string
}

function getConfig(status: CloudSyncStatus): StatusConfig {
  switch (status) {
    case 'syncing':
      return {
        icon: <RefreshCw size={12} className="animate-spin shrink-0" />,
        text: 'Salvando…',
        title: 'Salvando as alterações na sua conta…',
        className: 'text-[var(--color-muted)]',
      }
    case 'synced':
      return {
        // Check duplo verde = "tudo salvo na nuvem", inequivocamente positivo.
        icon: <CheckCheck size={12} className="shrink-0" />,
        text: 'Salvo na sua conta',
        title: 'Tudo salvo na sua conta e disponível em qualquer dispositivo.',
        className: 'text-emerald-400',
      }
    case 'pending':
      return {
        // Âmbar = atenção (ainda não sincronizou), não erro. O jogo está salvo localmente.
        icon: <CloudUpload size={12} className="shrink-0" />,
        text: 'Salvo neste navegador · sincroniza ao reconectar',
        title: 'Salvo neste navegador. Vai sincronizar com a sua conta assim que a conexão voltar — nada se perde.',
        className: 'text-amber-400',
      }
    case 'local-only':
    default:
      return {
        // HardDrive = "salvo no aparelho"; estado normal (deslogado), não é falha.
        icon: <HardDrive size={12} className="shrink-0" />,
        text: 'Salvo neste navegador',
        title: 'Salvo neste navegador. Entre na sua conta para sincronizar e ver em outros dispositivos.',
        className: 'text-[var(--color-muted)]',
      }
  }
}

export function SyncStatusIndicator({ status, onForceSync }: SyncStatusIndicatorProps) {
  const config = getConfig(status)
  const isClickable = onForceSync !== undefined && status !== 'syncing'
  const sharedClassName = `flex items-center gap-1.5 rounded-full border border-white/8 bg-black/15 px-2.5 py-1 backdrop-blur-sm ${config.className}${isClickable ? ' cursor-pointer' : ''}`

  if (isClickable) {
    return (
      <button
        type="button"
        aria-live="polite"
        aria-atomic="true"
        title="Sincronizar agora"
        aria-label="Sincronizar agora"
        onClick={onForceSync}
        className={sharedClassName}
      >
        {config.icon}
        <span className="hidden text-[10px] font-medium leading-none sm:inline">{config.text}</span>
      </button>
    )
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      title={config.title}
      className={sharedClassName}
    >
      {config.icon}
      <span className="hidden text-[10px] font-medium leading-none sm:inline">{config.text}</span>
    </div>
  )
}
