/**
 * SyncStatusIndicator
 *
 * Compact Google-Docs-style sync status badge for the control topbar.
 * Purely presentational — driven by CloudSyncStatus from useCloudSync.
 *
 * Only rendered when gameMode !== 'demo' (enforced by the caller).
 */

import { CheckCheck, CloudAlert, CloudUpload, HardDrive, RefreshCw } from 'lucide-react'
import type { CloudSyncStatus } from '@/modules/game/application/useCloudSync'
import { useTranslation } from '@/shared/i18n'
import type { TFunction } from 'i18next'

interface SyncStatusIndicatorProps {
  status: CloudSyncStatus
  /** When provided and status !== 'syncing', the pill becomes a clickable button. */
  onForceSync?: () => void | Promise<unknown>
  /** ISO do último sync bem-sucedido — vira "· 13:42" no texto. */
  lastSyncedAt?: string | null
}

interface StatusConfig {
  icon: React.ReactNode
  text: string
  /** Tooltip nativo (title) que explica o estado — responde "o que isso significa?". */
  title: string
  className: string
}

function formatSyncTime(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function getConfig(status: CloudSyncStatus, t: TFunction<'control'>, locale: string, lastSyncedAt?: string | null): StatusConfig {
  const syncTime = lastSyncedAt ? formatSyncTime(lastSyncedAt, locale) : ''
  switch (status) {
    case 'syncing':
      return {
        icon: <RefreshCw size={12} className="animate-spin shrink-0" />,
        text: t('syncStatus.saving'),
        title: t('syncStatus.savingTitle'),
        className: 'text-[var(--color-muted)]',
      }
    case 'synced':
      return {
        // Check duplo verde = "tudo salvo na nuvem", inequivocamente positivo.
        icon: <CheckCheck size={12} className="shrink-0" />,
        text: syncTime ? t('syncStatus.savedAt', { time: syncTime }) : t('syncStatus.saved'),
        title: syncTime
          ? t('syncStatus.savedAtTitle', { time: syncTime })
          : t('syncStatus.savedTitle'),
        className: 'text-emerald-400',
      }
    case 'pending':
      return {
        // Âmbar = atenção (ainda não sincronizou), não erro. O jogo está salvo localmente.
        icon: <CloudUpload size={12} className="shrink-0" />,
        text: syncTime
          ? t('syncStatus.pendingAt', { time: syncTime })
          : t('syncStatus.pending'),
        title: syncTime
          ? t('syncStatus.pendingAtTitle', { time: syncTime })
          : t('syncStatus.pendingTitle'),
        className: 'text-amber-400',
      }
    case 'review-needed':
      return {
        icon: <CloudAlert size={12} className="shrink-0" />,
        text: t('syncStatus.reviewNeeded'),
        title: t('syncStatus.reviewNeededTitle'),
        className: 'text-amber-400',
      }
    case 'local-only':
    default:
      return {
        // HardDrive = "salvo no aparelho"; estado normal (deslogado), não é falha.
        icon: <HardDrive size={12} className="shrink-0" />,
        text: t('syncStatus.local'),
        title: t('syncStatus.localTitle'),
        className: 'text-[var(--color-muted)]',
      }
  }
}

export function SyncStatusIndicator({ status, onForceSync, lastSyncedAt }: SyncStatusIndicatorProps) {
  const { t, i18n } = useTranslation('control')
  const config = getConfig(status, t, i18n.resolvedLanguage ?? i18n.language, lastSyncedAt)
  const isClickable = onForceSync !== undefined && status !== 'syncing'
  const sharedClassName = `flex items-center gap-1.5 rounded-full border border-white/8 bg-black/15 px-2.5 py-1 backdrop-blur-sm ${config.className}${isClickable ? ' cursor-pointer' : ''}`

  if (isClickable) {
    const actionLabel = status === 'review-needed'
      ? t('syncStatus.reviewAction')
      : t('syncStatus.syncNow')
    return (
      <button
        type="button"
        aria-live="polite"
        aria-atomic="true"
        title={actionLabel}
        aria-label={actionLabel}
        onClick={() => { void onForceSync() }}
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
