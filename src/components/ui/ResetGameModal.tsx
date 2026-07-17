import { useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'
import { useTranslation } from '@/shared/i18n'

interface ResetOptions {
  teams: boolean
  participants: boolean
  questions: boolean
  themes: boolean
  points: boolean
  films: boolean
}

interface ResetGameModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmReset: (options: ResetOptions) => void
}

const initialResetOptions: ResetOptions = {
  teams: false,
  participants: false,
  questions: true,
  themes: false,
  points: true,
  films: false,
}

export function ResetGameModal({
  isOpen,
  onClose,
  onConfirmReset,
}: ResetGameModalProps) {
  const { t } = useTranslation(['game', 'common'])
  const [resetOptions, setResetOptions] = useState<ResetOptions>(initialResetOptions)
  const [confirmDestructiveAction, setConfirmDestructiveAction] = useState(false)
  const [error, setError] = useState('')

  const handleToggleOption = (option: keyof ResetOptions) => {
    setError('')
    setResetOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }))
  }

  const handleClose = () => {
    setResetOptions(initialResetOptions)
    setConfirmDestructiveAction(false)
    setError('')
    onClose()
  }

  const handleConfirm = () => {
    if (!Object.values(resetOptions).some(Boolean)) {
      setError(t('reset.errorNone', { ns: 'game' }))
      return
    }

    if (!confirmDestructiveAction) {
      setError(t('reset.errorConfirmation', { ns: 'game' }))
      return
    }

    onConfirmReset(resetOptions)
    handleClose()
  }

  const resetAllOptions = () => {
    setResetOptions({
      teams: true,
      participants: true,
      questions: true,
      themes: true,
      points: true,
      films: true,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('reset.title', { ns: 'game' })}
      description={t('reset.description', { ns: 'game' })}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-[var(--color-danger)]" />
            <div>
              <h4 className="mb-1 text-sm font-semibold text-[var(--color-text)]">
                {t('reset.warningTitle', { ns: 'game' })}
              </h4>
              <p className="text-xs leading-6 text-[var(--color-muted)]">
                {t('reset.warningDescription', { ns: 'game' })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">{t('reset.choose', { ns: 'game' })}</h3>
          <Button variant="ghost" size="sm" onClick={resetAllOptions} className="text-xs">
            {t('actions.selectAll', { ns: 'common' })}
          </Button>
        </div>

        <div className="space-y-3">
          {[
            ['points', t('reset.options.points.title', { ns: 'game' }), t('reset.options.points.description', { ns: 'game' })],
            ['questions', t('reset.options.questions.title', { ns: 'game' }), t('reset.options.questions.description', { ns: 'game' })],
            ['films', t('reset.options.films.title', { ns: 'game' }), t('reset.options.films.description', { ns: 'game' })],
            ['teams', t('reset.options.teams.title', { ns: 'game' }), t('reset.options.teams.description', { ns: 'game' })],
            ['participants', t('reset.options.participants.title', { ns: 'game' }), t('reset.options.participants.description', { ns: 'game' })],
            ['themes', t('reset.options.themes.title', { ns: 'game' }), t('reset.options.themes.description', { ns: 'game' })],
          ].map(([key, title, description]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 transition-colors hover:bg-[var(--color-surface)]"
            >
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text)]">{title}</h4>
                <p className="text-xs text-[var(--color-muted)]">{description}</p>
              </div>
              <input
                type="checkbox"
                checked={resetOptions[key as keyof ResetOptions]}
                onChange={() => handleToggleOption(key as keyof ResetOptions)}
                className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
            </label>
          ))}
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
          <input
            type="checkbox"
            checked={confirmDestructiveAction}
            onChange={(event) => {
              setConfirmDestructiveAction(event.target.checked)
              setError('')
            }}
            className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <span className="text-sm leading-6 text-[var(--color-text)]">
            {t('reset.acknowledge', { ns: 'game' })}
          </span>
        </label>

        {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            className="flex flex-1 items-center justify-center gap-2 bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90"
          >
            <RefreshCw className="h-4 w-4" />
            {t('reset.confirm', { ns: 'game' })}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
