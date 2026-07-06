import { Modal } from './Modal'
import { FaqPanel } from '@/modules/control/ui/FaqPanel'

type InfoModalProps = {
  isOpen: boolean
  onClose: () => void
  onOpenOnboarding?: () => void
}

export function InfoModal({ isOpen, onClose, onOpenOnboarding }: InfoModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="FAQ / Ajuda"
      description="Versão modal da ajuda do host. O conteúdo segue o mesmo FAQ exibido na lateral do controle."
      size="xl"
    >
      <FaqPanel onOpenOnboarding={onOpenOnboarding ?? onClose} />
    </Modal>
  )
}
