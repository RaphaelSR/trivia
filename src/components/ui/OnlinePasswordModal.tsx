import { useState } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'
import { Lock, AlertCircle } from 'lucide-react'
import { usePinManagement } from '../../hooks/usePinManagement'
import { useTranslation } from '@/shared/i18n'

interface OnlinePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function OnlinePasswordModal({ isOpen, onClose, onSuccess }: OnlinePasswordModalProps) {
  const { t } = useTranslation(['auth', 'common'])
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { verifyPin } = usePinManagement('online')

  const handleSubmit = () => {
    if (verifyPin(password)) {
      setError('')
      setPassword('')
      onSuccess()
      onClose()
    } else {
      setError(t('legacyAccess.error', { ns: 'auth' }))
    }
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('legacyAccess.title', { ns: 'auth' })}
      description={t('legacyAccess.description', { ns: 'auth' })}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--color-primary)]" />
            <div>
              <h4 className="mb-1 text-sm font-semibold text-[var(--color-text)]">
                {t('legacyAccess.noticeTitle', { ns: 'auth' })}
              </h4>
              <p className="text-xs text-[var(--color-muted)]">
                {t('legacyAccess.noticeDescription', { ns: 'auth' })}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--color-text)]">
            {t('legacyAccess.pinLabel', { ns: 'auth' })}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="password"
              placeholder={t('legacyAccess.pinPlaceholder', { ns: 'auth' })}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit()
                }
              }}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-10 pr-4 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              autoFocus
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!password.trim()}
            className="flex-1"
          >
            {t('legacyAccess.submit', { ns: 'auth' })}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
