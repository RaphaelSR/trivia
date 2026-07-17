import { Modal } from './Modal'
import { FaqPanel } from '@/modules/control/ui/FaqPanel'
import { useTranslation } from '@/shared/i18n'

type InfoModalProps = {
  isOpen: boolean
  onClose: () => void
  onOpenOnboarding?: () => void
}

export function InfoModal({ isOpen, onClose, onOpenOnboarding }: InfoModalProps) {
  const { t } = useTranslation('control')
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('help.modalTitle')}
      description={t('help.modalDescription')}
      size="xl"
    >
      <FaqPanel onOpenOnboarding={onOpenOnboarding ?? onClose} />
    </Modal>
  )
}
