import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from '@/shared/i18n'

if (typeof document !== 'undefined' && !document.getElementById('trivia-portal')) {
  const portalRoot = document.createElement('div')
  portalRoot.id = 'trivia-portal'
  document.body.appendChild(portalRoot)
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
}

type ModalProps = {
  isOpen: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Impede fechar por X/Escape quando uma decisão explícita é obrigatória. */
  dismissible?: boolean
}

export function Modal({ isOpen, title, description, children, onClose, size = 'md', dismissible = true }: ModalProps) {
  const { t } = useTranslation('common')
  // Esc fecha — padrão de teclado esperado em qualquer modal.
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dismissible, isOpen, onClose])

  if (!isOpen) return null

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className={`card-surface flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl ${sizeClasses[size]}`}>
        <div className="flex shrink-0 items-start justify-between px-5 pt-5">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-[var(--color-muted)]">{description}</p> : null}
          </div>
          {dismissible ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('actions.close')}
              onClick={onClose}
              className="-mr-1 -mt-1 h-11 w-11 shrink-0"
            >
              <X size={16} />
            </Button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">{children}</div>
      </div>
    </div>
  )

  const portalRoot = document.getElementById('trivia-portal')
  if (!portalRoot) {
    return content
  }
  return createPortal(content, portalRoot)
}
