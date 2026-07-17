import { Loader2, PlayCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'
import type { FinishedGameCopyMode } from '@/modules/game/domain/historical-game-copy'
import { useTranslation } from '@/shared/i18n'

type FinishedGameCopyModalProps = {
  isOpen: boolean
  sourceTitle: string
  busy?: boolean
  error?: string | null
  onClose: () => void
  onChoose: (mode: FinishedGameCopyMode) => void
}

export function FinishedGameCopyModal({
  isOpen,
  sourceTitle,
  busy = false,
  error,
  onClose,
  onChoose,
}: FinishedGameCopyModalProps) {
  const { t } = useTranslation(['game', 'common'])

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => undefined : onClose}
      title={t('finishedCopy.title', { ns: 'game' })}
      description={t('finishedCopy.description', { ns: 'game', title: sourceTitle })}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <p className="text-xs leading-5 text-[var(--color-muted)]">
            {t('finishedCopy.originalSafe', { ns: 'game' })}
          </p>
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            disabled={busy}
            onClick={() => onChoose('continue')}
            className="h-auto min-h-16 w-full items-start justify-start px-4 py-3 text-left"
          >
            {busy ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" /> : <PlayCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="min-w-0">
              <span className="block text-sm">{t('finishedCopy.continue.title', { ns: 'game' })}</span>
              <span className="mt-0.5 block text-xs font-normal leading-4 opacity-80">
                {t('finishedCopy.continue.description', { ns: 'game' })}
              </span>
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onChoose('restart')}
            className="h-auto min-h-16 w-full items-start justify-start px-4 py-3 text-left"
          >
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm">{t('finishedCopy.restart.title', { ns: 'game' })}</span>
              <span className="mt-0.5 block text-xs font-normal leading-4 text-[var(--color-muted)]">
                {t('finishedCopy.restart.description', { ns: 'game' })}
              </span>
            </span>
          </Button>
        </div>

        {error ? (
          <p role="status" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={onClose}
          className="h-11 w-full"
        >
          {t('actions.cancel', { ns: 'common' })}
        </Button>
      </div>
    </Modal>
  )
}
